from __future__ import with_statement
import cgi
import logging
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'

from google.appengine.dist import use_library
use_library('django', '1.2')

import urllib, urllib2
from google.appengine.api import images
from google.appengine.api import urlfetch
from google.appengine.api import users
from google.appengine.ext import blobstore
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp import blobstore_handlers
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.api import files
from django.utils import simplejson as json
import time

from oauth import OAuth

options = {
}

class MainPage(webapp.RequestHandler):
    def get(self):
        o = OAuth(options)

        template_values = {
            'title': "15th Dover - OAuth",
            'oauth': o
        }

        path = os.path.join(os.path.dirname(__file__), 'template_auth.html')
        self.response.out.write(template.render(path, template_values))

class StartPage(webapp.RequestHandler):
    def get(self):
        o = OAuth(options)
        try:
            url = o.get_request_token()
            self.redirect(url)
        except Exception, e:
            logging.error(e)
            self.response.out.write("Could not get RequestToken")

class LogoutHandler(webapp.RequestHandler):
    def get(self):
        o = OAuth(options)
        o.logout()
        self.redirect('/auth')

class CallbackHandler(webapp.RequestHandler):
    def get(self):
        o = OAuth(options)
        oauth_token = self.request.get('oauth_token')
        oauth_verifier = self.request.get('oauth_verifier')
        try:
            o.get_access_token(oauth_token, oauth_verifier)
            path = os.path.join(os.path.dirname(__file__), 'template_closepopup.html')
            self.response.out.write(template.render(path,{'redirect':'/'}))
        except Exception, e:
            logging.error(e)
            self.response.out.write("Could not get AccessToken")

class TestHandler(webapp.RequestHandler):
    def get(self):
        o = OAuth(options)
        url = 'http://15thdoverscouts.org.uk/api/users.json?'+str(time.time())
        method = 'GET'
        result = urlfetch.fetch(url=url,
            method=method,
            headers={
                'Authorization': 'OAuth realm="http://15thdoverscouts.org.uk", ' + o.get_headers(method, url, {}),
                'Cache-Control' : 'max-age=300'
            }
        )
        self.response.out.write(result.content)

application = webapp.WSGIApplication([  ('/auth', MainPage),
                                        ('/auth/start', StartPage),
                                        ('/auth/logout', LogoutHandler),
                                        ('/auth/callback', CallbackHandler),
                                        ('/auth/test-users', TestHandler)],
                                     debug=False)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
