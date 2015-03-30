import logging
import sessions
import time
from google.appengine.api import urlfetch
from google.appengine.dist import use_library
use_library('django', '1.2')
from django.utils import simplejson as json
import urllib
import cgi
import sessions
import hmac, hashlib, base64
from datetime import datetime

class OAuth:
    token = None
    session = None

    def __init__(self, options):
        self.options = options
        self.session = sessions.Session()

    def is_authorized(self):
        try:
            token = self.get_token()
        except Exception, e:
            logging.error(e)
            return False

        return token is not None

    def username(self):
        try:
            token = self.get_token()
        except Exception, e:
            logging.error(e)

        if token != None:
            return token['username']

    def expiry(self):
        try:
            token = self.get_token()

            if token:
                return datetime.fromtimestamp(float(token['expiry']))
        except Exception, e:
            logging.error(e)

    def logout(self):
        self.session.clear()

    def get_request_token(self):
        method='POST'#urlfetch.POST
        url=self.options['request_token_url']
        timestamp = time.time()
        oauth_params = {
            'oauth_consumer_key': self.options['oauth_consumer_key'],
            'oauth_signature_method': "HMAC-SHA1",
            'oauth_timestamp': str(timestamp),
            'oauth_nonce': self._get_nonce(timestamp),
            'oauth_version': "1",
            'oauth_callback': self.options['callback_url']
        }
        params = oauth_params
        secret = self.options['oauth_consumer_secret']
        signature = self._generate_signature(method, url, params, secret, '')
        oauth_params['oauth_signature'] = signature
        oauth_headers = ', '.join(['%s="%s"' % (key, value) for (key, value) in oauth_params.items()])
        try:
            result = urlfetch.fetch(url=url,
                method=method,
                headers={'Authorization': 'OAuth realm="' + self.options['realm'] + '", ' + oauth_headers}
            )
            if result.status_code != 200:
                raise Exception('Not Authorized')
            values = cgi.parse_qs(result.content)
            oauth_token = values['oauth_token'][0]
            s = self.session
            s['oauth_token_secret'] = values['oauth_token_secret'][0]
            url = self.options['authorization_url'] + ('?', '&')['?' in self.options['authorization_url']] +\
                "oauth_token=" + oauth_token
            return url
        except Exception, e:
            logging.error(e)
            logging.debug(result.content)
            raise e

    def get_access_token(self, oauth_token, oauth_verifier):
        method='POST'#urlfetch.POST
        url=self.options['access_token_url']
        timestamp = time.time()
        oauth_params = {
            'oauth_consumer_key': self.options['oauth_consumer_key'],
            'oauth_token': oauth_token,
            'oauth_signature_method': "HMAC-SHA1",
            'oauth_timestamp': str(timestamp),
            'oauth_nonce': self._get_nonce(timestamp),
            'oauth_version': "1",
            'oauth_verifier': oauth_verifier
        }
        params = oauth_params
        secret = self.options['oauth_consumer_secret']
        s = self.session
        oauth_token_secret = s['oauth_token_secret']
        signature = self._generate_signature(method, url, params, secret, oauth_token_secret)
        oauth_params['oauth_signature'] = signature
        oauth_headers = ', '.join(['%s="%s"' % (key, value) for (key, value) in oauth_params.items()])
        try:
            result = urlfetch.fetch(url=url,
                method=method,
                headers={'Authorization': 'OAuth realm="' + self.options['realm'] + '", ' + oauth_headers}
            )
            if result.status_code != 200:
                raise Exception('Not Authorized')
            values = cgi.parse_qs(result.content)
            s['oauth_token'] = values['oauth_token'][0]
            s['oauth_token_secret'] = values['oauth_token_secret'][0]
            s['username'] = values['username'][0]
            return True
        except Exception, e:
            logging.error(e)
            logging.debug(result.content)
            raise e

    def get_token(self):
        if not self.token:
            method = 'POST'
            url = self.options['get_token_url']
            oauth_headers = self.get_headers(method, url, {})
            try:
                result = urlfetch.fetch(url=url,
                    method=method,
                    headers={'Authorization': 'OAuth realm="' + self.options['realm'] + '", ' + oauth_headers}
                )
                if result.status_code != 200:
                    return None

                self.token = json.loads(result.content)

            except Exception, e:
                logging.error(e)
                logging.debug(result.content)
                return None

        return self.token

    def get_headers(self, method, url, params):
        s = self.session
        if 'oauth_token' not in s or 'oauth_token_secret' not in s:
            return ""

        oauth_token = s['oauth_token']
        oauth_token_secret = s['oauth_token_secret']
        timestamp = time.time()
        oauth_params = {
            'oauth_consumer_key': self.options['oauth_consumer_key'],
            'oauth_token': oauth_token,
            'oauth_signature_method': "HMAC-SHA1",
            'oauth_timestamp': str(timestamp),
            'oauth_nonce': self._get_nonce(timestamp),
            'oauth_version': "1"
        }
        params.update(oauth_params)
        secret = self.options['oauth_consumer_secret']
        signature = self._generate_signature(method, url, params, secret, oauth_token_secret)
        oauth_params['oauth_signature'] = signature
        oauth_headers = ', '.join(['%s="%s"' % (key, value) for (key, value) in oauth_params.items()])
        
        return oauth_headers

    def _generate_signature(self, method, url, params, consumer_secret, token_secret):
        params = params.items()
        params.sort()
        base_url = method + "&" + urllib.quote_plus(url) + "&" + urllib.quote_plus(urllib.urlencode(params))
        key = consumer_secret + "&" + token_secret
        h = hmac.new(key, base_url, hashlib.sha1)
        digest = base64.b64encode(h.digest())
        return digest

    def _get_nonce(self, timestamp):
        return ""
