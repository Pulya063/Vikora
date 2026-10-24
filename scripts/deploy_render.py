"""Manual CD for pre-existing Render services. Never provisions paid resources."""
import json
import os
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class DeploymentError(RuntimeError):
    pass


def configuration(env):
    if env.get('DEPLOY_ENABLED') != 'true':
        raise DeploymentError('Set production environment variable DEPLOY_ENABLED=true after reviewing the deployment settings')
    if env.get('GITHUB_REF') != 'refs/heads/main':
        raise DeploymentError('Only main can be deployed')
    sha = env.get('GITHUB_SHA', '')
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise DeploymentError('A complete tested commit SHA is required')
    repository = env.get('GITHUB_REPOSITORY', '')
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository):
        raise DeploymentError('GitHub repository is required')
    key = env.get('RENDER_API_KEY')
    if not key:
        raise DeploymentError('Configure RENDER_API_KEY as a production environment secret')
    services = []
    for name in ('API', 'WORKER', 'FRONT'):
        service = env.get(f'RENDER_{name}_SERVICE_ID', '')
        if name == 'WORKER' and not service:
            continue  # Deferred Telegram/Notion delivery can remain disabled.
        if not re.fullmatch(r'srv-[a-z0-9]+', service):
            raise DeploymentError(f'Configure RENDER_{name}_SERVICE_ID')
        services.append((name, service))
    if len({service for _, service in services}) != len(services):
        raise DeploymentError('Each component must have a distinct service ID')
    return sha, repository, key, services


def api(key, method, path, body=None):
    request = Request('https://api.render.com/v1' + path,
        data=None if body is None else json.dumps(body).encode(), method=method,
        headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    try:
        with urlopen(request, timeout=30) as response:
            return json.load(response)
    except HTTPError as exc:
        # Never log response bodies, authorization headers, or customer data.
        raise DeploymentError(f'Render API returned HTTP {exc.code}') from None
    except (URLError, TimeoutError, ValueError):
        raise DeploymentError('Render API request failed; inspect deployment status before retrying') from None


def deploy(env, request=api, sleep=time.sleep, clock=time.monotonic):
    sha, repository, key, services = configuration(env)
    # Validate all targets before triggering any deployment.
    for name, service in services:
        info = request(key, 'GET', f'/services/{service}')
        if info.get('repo', '').rstrip('/').removesuffix('.git') != f'https://github.com/{repository}':
            raise DeploymentError(f'{name}: repository does not match the tested code')
        if info.get('branch') != 'main' or info.get('autoDeploy') != 'no':
            raise DeploymentError(f'{name}: use branch main and disable Render auto-deploy for manual CD')
    for name, service in services:
        result = request(key, 'POST', f'/services/{service}/deploys', {'commitId': sha, 'clearCache': 'do_not_clear'})
        deploy_id = result.get('id', '')
        if not re.fullmatch(r'dep-[a-z0-9]+', deploy_id):
            raise DeploymentError(f'{name}: no deployment ID returned; inspect Render before retrying')
        deadline = clock() + 1200
        while clock() < deadline:
            state = request(key, 'GET', f'/services/{service}/deploys/{deploy_id}')
            status = state.get('status')
            if status == 'live':
                if state.get('commit', {}).get('id') != sha:
                    raise DeploymentError(f'{name}: live commit does not match tested SHA')
                print(f'{name}: live at {sha}')
                break
            if status in {'build_failed', 'pre_deploy_failed', 'update_failed', 'canceled', 'deactivated'}:
                raise DeploymentError(f'{name}: deployment {status}; later services were not deployed')
            sleep(20)
        else:
            raise DeploymentError(f'{name}: timeout; inspect Render before retrying')


if __name__ == '__main__':
    try:
        deploy(os.environ)
    except DeploymentError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
