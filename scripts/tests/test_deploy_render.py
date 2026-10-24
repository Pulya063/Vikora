import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('deploy_render',Path(__file__).parents[1]/'deploy_render.py')
deploy_render=importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy_render)


class DeployTests(unittest.TestCase):
    def setUp(self):
        self.env=dict(DEPLOY_ENABLED='true',GITHUB_REF='refs/heads/main',GITHUB_SHA='a'*40,
            GITHUB_REPOSITORY='example/site',RENDER_API_KEY='test-key',
            RENDER_API_SERVICE_ID='srv-api',RENDER_FRONT_SERVICE_ID='srv-front')
        self.calls=[]

    def request(self,key,method,path,body=None):
        self.calls.append((method,path,body))
        if method=='POST': return {'id':'dep-example'}
        if '/deploys/' in path: return {'status':'live','commit':{'id':self.env['GITHUB_SHA']}}
        return {'repo':'https://github.com/example/site','branch':'main','autoDeploy':'no'}

    def test_disabled_before_any_request(self):
        self.env['DEPLOY_ENABLED']='false'
        with self.assertRaises(deploy_render.DeploymentError): deploy_render.deploy(self.env,self.request)
        self.assertEqual(self.calls,[])

    def test_only_main(self):
        self.env['GITHUB_REF']='refs/heads/feature'
        with self.assertRaises(deploy_render.DeploymentError): deploy_render.deploy(self.env,self.request)
        self.assertEqual(self.calls,[])

    def test_tests_exact_commit_and_deploys_in_order(self):
        deploy_render.deploy(self.env,self.request)
        posts=[call for call in self.calls if call[0]=='POST']
        self.assertEqual([call[1] for call in posts],['/services/srv-api/deploys','/services/srv-front/deploys'])
        self.assertTrue(all(call[2]['commitId']==self.env['GITHUB_SHA'] for call in posts))

    def test_wrong_target_never_deploys(self):
        def request(*args): return {'repo':'https://github.com/other/site','branch':'main','autoDeploy':'no'}
        with self.assertRaises(deploy_render.DeploymentError): deploy_render.deploy(self.env,request)

    def test_failure_stops_later_services(self):
        def request(key,method,path,body=None):
            if '/deploys/' in path: return {'status':'build_failed'}
            return self.request(key,method,path,body)
        with self.assertRaises(deploy_render.DeploymentError): deploy_render.deploy(self.env,request)
        self.assertEqual(len([c for c in self.calls if c[0]=='POST']),1)

    def test_wrong_live_commit_fails(self):
        def request(key,method,path,body=None):
            if '/deploys/' in path: return {'status':'live','commit':{'id':'b'*40}}
            return self.request(key,method,path,body)
        with self.assertRaises(deploy_render.DeploymentError): deploy_render.deploy(self.env,request)


if __name__=='__main__': unittest.main()
