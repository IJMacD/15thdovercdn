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
from oauth import OAuth

options = {
    'realm': "http://15thdoverscouts.org.uk",
    'request_token_url': "http://15thdoverscouts.org.uk/auth/request",
    'authorization_url': "http://15thdoverscouts.org.uk/auth/authorize",
    'access_token_url': "http://15thdoverscouts.org.uk/auth/access",
    'get_token_url': "http://15thdoverscouts.org.uk/auth/getToken",
    'callback_url': "http://static.15thdoverscouts.org.uk/gallery/oauthcallback",
    'oauth_consumer_key': "2fdce932-aaf1-4861-a572-7f04fdcf8a37",
    'oauth_consumer_secret': "ACB83F8B54A68ABF3f0C1C88D3179E91"
}

class Album(db.Model):
    gid = db.IntegerProperty()
    title = db.StringProperty()
    description = db.StringProperty(indexed=False)
    posted = db.BooleanProperty(default=False,indexed=False)

class Image(db.Model):
    blob = blobstore.BlobReferenceProperty()
    serving_url = db.StringProperty()

    """
    get_serving_url is sooo slow.

    Solution here is to cache it when it is first needed.
    Longer term solution may involve rpc (async) requests
    """
    def _get_url(self):
        if not self.serving_url:
            self.serving_url = images.get_serving_url(self.blob.key())
            self.put()
        return self.serving_url

    def thumb(self):
        return self._get_url() + "=s120"

    def url(self):
        return self._get_url() + "=s640"
    
    def full(self):
        return self._get_url() + "=s1600"

class MainPage(webapp.RequestHandler):
    def get(self):
        logging.debug("Request Started")
        _albums = Album.all()
        albums = [];
        error = self.request.get('error')
        o = OAuth(options)
        logged_in = o.is_authorized()
        logging.debug("OAuth Authorization: "+str(logged_in))

        for album in _albums:
            album.images = Image.all().ancestor(album).run(limit=5)
            albums.append(album)

        logging.debug("Added Albums")

        template_values = {
            'action': blobstore.create_upload_url("/gallery/process"),
            'albums': albums,
            'error': error,
            'logged_in': logged_in
        }

        logging.debug("Prepared template")

        path = os.path.join(os.path.dirname(__file__), 'template.html')
        self.response.out.write(template.render(path, template_values))
        
class GetUrlPage(webapp.RequestHandler):
    def get(self):
        self.response.out.write(blobstore.create_upload_url('/gallery/process'))
        #self.response.out.write(blobstore.create_upload_url(self.request.get('callback')))
        
class GetImageUrlPage(webapp.RequestHandler):
    def get(self, photo_key):
        if(photo_key is None):
            photo_key = self.request.get('photo_key')
        self.response.out.write(images.get_serving_url(photo_key, 600))
        
class ErrorPage(webapp.RequestHandler):
    def get(self):
        template_values = {
            'title': "Error During processing",
            'message': "There was an error whilst trying to send back the results of the photo upload"
        }
        path = os.path.join(os.path.dirname(__file__), 'error.html')
        self.response.out.write(template.render(path, template_values))
        
class RedirectPage(webapp.RequestHandler):
    def get(self):
        self.response.out.write(self.request.get('r'))

class UploadHandler(blobstore_handlers.BlobstoreUploadHandler):
    def post(self):
        # Info
        logging.info(str(len(self.get_uploads())) + " files found")
        
        # Get album information
        albumchoice = self.request.get('albumchoice')
        title = self.request.get('title')
        description = self.request.get('body')
        gid = int(self.request.get('existingalbum') or 0)
        
        if albumchoice == "new":
            gid = 0
        
        # Create an album to save upload
        album = Album(title = title,
                        description = description,
                        gid = gid)
        album.put()
        
        # Create Images from upload Blobs
        for upload_file in self.get_uploads():
            if upload_file.size:
                image = Image(parent = album,
                        blob = upload_file.key())
                image.put()
        
        url = forward_gallery(album)
        
        if url is False:
            redirect = "/gallery?error=submit"
        else:
            redirect = url
        
        logging.info("Redirecting to: " + redirect)
        self.redirect("/gallery/redirect?r=" + redirect)

class PicasaUploadHandler(webapp.RequestHandler):
    def post(self):

        o = OAuth(options)
        logged_in = o.is_authorized()
        template_values = {
            'logged_in': logged_in,
            'upload_url': blobstore.create_upload_url('/gallery/process'),
            'images': {}
        }

        path = os.path.join(os.path.dirname(__file__), 'template_uploader.html')
        self.response.out.write(template.render(path, template_values))

class OAuthStartHandler(webapp.RequestHandler):
    def get(self):
        o = OAuth(options)
        try:
            url = o.get_request_token()
            self.redirect(url)
        except Exception, e:
            logging.error(e)
            self.response.out.write("Could not get RequestToken")

class OAuthCallbackHandler(webapp.RequestHandler):
    def get(self):
        o = OAuth(options)
        oauth_token = self.request.get('oauth_token')
        oauth_verifier = self.request.get('oauth_verifier')
        try:
            o.get_access_token(oauth_token, oauth_verifier)
            path = os.path.join(os.path.dirname(__file__), 'template_closepopup.html')
            self.response.out.write(template.render(path,{'callback':'setAuthorized','redirect':'/gallery'}))
        except Exception, e:
            logging.error(e)
            self.response.out.write("Could not get AccessToken")

def forward_gallery(album):
    """ Perform the actual forwarding of the Gallery
    
    """
    data = []

    imgs = Image.all().ancestor(album)
    for image in imgs:
        data.append({'key': str(image.blob.key()), 'url': images.get_serving_url(image.blob)})
    
    # Info
    logging.info(data)
    
    url = 'http://15thdoverscouts.org.uk/photo/callback';
    form_fields = {
      "albumchoice": ('existing','new')[album.gid == 0],
      "title": album.title,
      "body": album.description,
      "existingalbum": album.gid,
      "images": json.dumps(data)
    }
    form_data = urllib.urlencode(form_fields)
    
    try:
        result = urlfetch.fetch(url=url,
                    payload=form_data,
                    method=urlfetch.POST,
                    headers={'Content-Type': 'application/x-www-form-urlencoded'})
        from urlparse import urlparse
        r = urlparse(result.content)
        if r.scheme == "http":
            album.posted = True
            album.put()
            return result.content
        else:
            logging.error('Web Server repsonded with invalid url:' + result.content + '\nResubmit with:\n' + form_data);
            return False
    except Exception:
        logging.error('Error Posting results to Web Server\n' + form_data);
        return False

class ForwardHandler(webapp.RequestHandler):
    """ Forward an album to the web server
    
    This Handler sends (or resends) uploaded blobs back to the web server
    usually if they have not already been sent beacuse they failed the first
    time
    
    """
    def post(self):
        key = self.request.get('key')
            
        if(len(key) == 0):
            logging.warning("Didn't receive a valid key")
            self.response.out.write("Didn't receive a valid key")
            self.error(400)
            return
        
        album = db.get(key)
        
        if album is None:
            logging.warning("No album exists with that key")
            self.response.out.write("No album exists with that key")
            self.error(400)
            return
        
        url = forward_gallery(album)
        
        if url is False:
            logging.warning("Failed to forward gallery")
            self.response.out.write("Could not forward gallery")
            self.error(500)
            return
        
        self.response.out.write(url)
        
class DeleteHandler(webapp.RequestHandler):
    """ Delete an album to the web server
    
    This Handler will delete the datastore representation of the album and
    its ascociated image representations. At the moment it will not touch the
    underlying blobs.
    
    """
    def post(self):
        key = self.request.get('key')
            
        if(len(key) == 0):
            logging.warning("Didn't receive a valid key")
            self.response.out.write("Didn't receive a valid key")
            self.error(400)
            return
        
        album = db.get(key)
        
        if album is None:
            logging.warning("No album exists with that key")
            self.response.out.write("No album exists with that key")
            self.error(400)
            return
        
        imgs = Image.all().ancestor(album)
        for image in imgs:
            image.delete()
        
        album.delete()
        
        logging.info("Deleted an album")

class MigrateHandler(webapp.RequestHandler):
    def post(self):
        url = self.request.get('url')
        if(len(url) == 0):
            self.response.out.write("Didn't receive a valid URL")
            self.error(400)
        
        else:        
            json_url = url + ".json"
            try:
                logging.info("Trying url: "+json_url)
                result = urlfetch.fetch(json_url)
                if(result.status_code == 200):
                    gallery = url[29:]
                    self.response.out.write("<p>"+gallery+"</p>")
                    js = json.loads(result.content)
                    
                    queue = []
                    for item in js['items']:
                        url = item['enclosures'][0]['url']
                        if(url.startswith("http://15thdoverscouts.org.uk")):
                            rpc = urlfetch.create_rpc()
                            urlfetch.make_fetch_call(rpc, url)
                            queue.append({ 'id': url[-36:-4], 'rpc': rpc })
                    
                    logging.info(str(len(queue))+" pictures found")
                    
                    imgs = []
                    for item in queue:
                        result = item['rpc'].get_result()
                        if(result.status_code == 200):
                            file = files.blobstore.create(mime_type='image/jpeg')
                            with files.open(file, 'a') as f:
                                f.write(result.content)
                            files.finalize(file)
                            blob_key = str(files.blobstore.get_blob_key(file))
                            imgs.append({'id': item['id'], 'blob_key': blob_key, 'url': images.get_serving_url(blob_key) })
                    
                    logging.info(str(len(imgs))+" images ready")
                    logging.debug(imgs)
                    
                    form_fields = {
                      "submigrategallery": 1,
                      "gallery": gallery,
                      "json": json.dumps(imgs)
                    }
                    
                    form_data = urllib.urlencode(form_fields)
                    result = urlfetch.fetch(url="http://15thdoverscouts.org.uk/gallery/process",
                                            payload=form_data,
                                            method=urlfetch.POST,
                                            headers={'Content-Type': 'application/x-www-form-urlencoded'})
                    if(result.status_code == 200):
                        self.response.out.write("<p>Successfully sent results</p>")
                        self.response.out.write("<p>"+result.content+"</p>")
                        
                        path = os.path.join(os.path.dirname(__file__), 'migrate.html')
                        self.response.out.write(template.render(path, None))
            except urlfetch.DownloadError, e:
                logging.error(e)
                self.response.out.write("<p>Download Error</p>")
                self.error(500)

class ServeHandler(blobstore_handlers.BlobstoreDownloadHandler):
    def get(self, photo_key, size):
        photo_key = str(urllib.unquote(photo_key))
        if not blobstore.get(photo_key):
            self.error(404)
        else:
            #self.send_blob(photo_key)
            self.response.out.write(photo_key)

class ImageServer(webapp.RequestHandler):
    def get(self, photo_key, size):
        photo_key = str(urllib.unquote(photo_key))
        if not blobstore.get(photo_key):
            self.error(404)
        else:
            img = images.Image(blob_key=photo_key)
            if size != "full":
                if size == "medium":
                    dim = {'width': 320, 'height': 240}
                elif size == "thumb":
                    dim = {'width': 120, 'height': 90}
                elif size == "small":
                    dim = {'width': 200, 'height': 150}
                else:
                    dim = {'width': 800, 'height': 600}
                img.resize(**dim)
            out = img.execute_transforms(output_encoding=images.JPEG)

            self.response.headers['Content-Type'] = 'image/jpeg'
            self.response.out.write(out)

application = webapp.WSGIApplication(
                                     [('/gallery', MainPage),
                                      ('/gallery/forward', ForwardHandler),
                                      ('/gallery/delete', DeleteHandler),
                                      ('/gallery/getprocessurl', GetUrlPage),
                                      ('/gallery/getimageurl(?:/([a-zA-Z0-9-_=]+))?', GetImageUrlPage),
                                      ('/gallery/redirect', RedirectPage),
                                      ('/gallery/error', ErrorPage),
                                      ('/gallery/migrate', MigrateHandler),
                                      ('/gallery/process', UploadHandler),
                                      ('/gallery/upload', PicasaUploadHandler),
                                      ('/gallery/picasa', PicasaUploadHandler),
                                      ('/gallery/oauthstart', OAuthStartHandler),
                                      ('/gallery/oauthcallback', OAuthCallbackHandler),
                                      ('/gallery/image/([a-zA-Z0-9-_=]+)(?:/([a-z]+))?', ImageServer)],
                                     debug=False)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()