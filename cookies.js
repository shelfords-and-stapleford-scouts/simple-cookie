/*global CookiePolicy */
(function(n,w,d){
  'use strict';
 /*
+----------------------------------------------------------------------
| Copyright (c) 2019 Genome Research Ltd.
| This file is part of the Pagesmith web framework.
+----------------------------------------------------------------------
| The Pagesmith web framework is free software: you can redistribute
| it and/or modify it under the terms of the GNU Lesser General Public
| License as published by the Free Software Foundation; either version
| 3 of the License, or (at your option) any later version.
|
| This program is distributed in the hope that it will be useful, but
| WITHOUT ANY WARRANTY; without even the implied warranty of
| MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
| Lesser General Public License for more details.
|
| You should have received a copy of the GNU Lesser General Public
| License along with this program. If not, see:
|     <http://www.gnu.org/licenses/>.
+----------------------------------------------------------------------
#
# Code to handle updated PECR cookie code...
#  - re-written to use "vanilla" JS rather than jQuery so
#    can be dropped into sites without jQuery installed in them
#  - currently the gcc version compressed is just over 2K in size
#  - need corresponding style sheet /core/css/cookies.js to
#    complete the coding
#  - along with a runner script/line if you require to change
#    the default settings
#  - This must be run before any other code which sets cookies
#    so that they can use the:
#      CookiePolicy.is_set( 'type' );
#    to act accordingly...
#  - default types are:
#      f1 - functional cookies set by site (required)
#      t1 - tracking   cookies set by site
#      f3 - functional cookies set by third party sites (required)
#      t3 - tracking   cookies set by third party sites
#      m3 - marketing  cookies set by third party sites
#  - by default f1/t1 are turned on by default...
#    to enable other cookie types to be shown/selected call:
#      CookiePolicy.set_types( 'type1', 'type2', .... );
#  - to disable some cookie types call:
#      CookiePolicy.clear_types( 'type1', 'type2', .... );
#  - if you wish to add your own type call:
#      CookiePolicy.add_type( 'code', 'title', 'text', thirdparty (true/false), required )
#  - two parameters are setable:
#      CookiePolicy.set_policy_url( 'URL'  ) - sets URL of privacy policy
#      CookiePolicy.set_ga_code(    'code' ) - sets the Google Analytics site code if using GA
#  - code uses jQuery-esqe - return self approach so you can concatenate calls (see runner)
#    e.g.
#      CookiePolicy.set_policy_url( '/test' )   // Set privacy policy URL
#                  .set_ga_code(    'UA-TEST' ) // Set Google analytics code
#                  .set_types(      'f3','t3' ) // Enable types f3 and t3
#                  .clear_types(    't1' )      // Disable t1
#                  .add_type(       'o1',       // Add own type...
#                    'Other', 'Not required enhancement cookies', false, false );
#                  .footer()                    // Display footer (must be called)
#                  .tracking();                 // Block cookies in tracking if required (called if tracking)
#  - Added the code to include this in Wordpress base theme class plugin
#
# Author         : js5
# Maintainer     : js5
# Created        : 2019-01-04
# Last commit by : $Author: js5 $
# Last modified  : $Date: 2019-01-06 09:49:24 +0000 (Sun, 06 Jan 2019) $
# Revision       : $Revision: 3962 $
# Repository URL : $HeadURL: svn+psssh://pagesmith-core@web-wwwsvn/repos/svn/pagesmith/pagesmith-core/trunk/htdocs/core/js/cookies-vanilla.js $
*/

// Main cookie policy object
  w.CookiePolicy = {
    // Information about trackability (based on DNT settings)
    dnt:    undefined,  // Do not track setting from browser
    track:  undefined,  // Trackable flag - true or false if can acertain DNT value - undefined otherwise
    state:  undefined,  // Current state string to know what to do or check...
    init:   function() { /* PUBLIC */
      this.dnt = (typeof n.doNotTrack   !== 'undefined')     ? n.doNotTrack
               : (typeof w.doNotTrack   !== 'undefined')     ? w.doNotTrack
               : (typeof n.msDoNotTrack !== 'undefined')     ? n.msDoNotTrack
               : 'msTrackingProtectionEnabled' in w.external ? ( w.external.msTrackingProtectionEnabled() ? 1 : 0 )
               : null
               ;
      this.track = ( 1 === parseInt(this.dnt,10) || 'yes' === this.dnt ) ? false
                     : ( 0 === parseInt(this.dnt,10) || 'no'  === this.dnt || this.dnt === null ? true : undefined );
      this.get();
      return this;
    },
    parse_meta: function() {
      var x = document.getElementsByTagName("meta"), met = {}, i = x.length;
      for( i; i; i ) {
        i--;
        if( x[i].content && x[i].name ) {
          met[x[i].name] = x[i].content;
        }
      }
      if( met.hasOwnProperty( 'simplecookie_ga_code' ) && met.simplecookie_ga_code ) {
        this.set_ga_code( ga_code );
      }
      if( met.hasOwnProperty( 'simplecookie_types' ) && met.simplecookie_types ) {
        this.reset_types().set_types( met.simplecookie_types.split(/\s+/) );
      }
      if( met.hasOwnProperty( 'simplecookie_policy' ) && met.simplecookie_policy ) {
        this.set_policy_url( met.simplecookie_policy );
      }
      return this;
    },
    // Generic cookie functions... to get and set the cookie policy cookie!
    set: function () {
      d.cookie = 'CookiePolicy=' + this.state + '; expires=Tue, 19 Jan 2038 00:00:00 GMT; path=/';
      return this;
    },
    get: function () {
      this.state = '';
      if (typeof (d.cookie) !== 'undefined') {
        var cookie = d.cookie.match(new RegExp('(^|;)\\s*CookiePolicy=([^;\\s]*)'));
        if( cookie ) {
          this.state = cookie[2];
        }
      }
      return this;
    },
    // Define types ... and handling changes to types...
    types: {
      fi: {
        caption: 'Our cookies',
        cookies: {
          f1: {
            title:  'Functional',
            text:   'Allows functions of the website to work (<em>e.g.</em> remembering cookie' +
                    ' preferences, capabilities of your browser, security cookies - CSRF/user/session)',
            req:    true,
            used:   true
          },
          t1: {
            title:  'Tracking',
            text:   'Tracks your usage on our website, enabling us to generate aggregated reports of' +
                    ' usage and optimize the functionality of the website - this data is not shared'  +
                    ' with third-party organisations but held on our own servers',
            req:    false,
            used:   true
          }
        }
      },
      th: {
        caption: 'Third party cookies',
        cookies: {
          f3: {
            title:  'Functional (3rd party)',
            text:   'Allows functions of the website to work (reCAPCHA, fonts, maps,' +
                    ' embedded videos etc)',
            req:    true,
            used:   false
          },
          t3: {
            title:  'Tracking (3rd party)',
            text:   'Tracks your usage on our website, enabling us to generate aggregated reports' +
                    ' of usage and optimize the functionality of the website.',
            req:    false,
            used:   false
          },
          m3: {
            title:  'Marketing (3rd party)',
            text:   'To enable customisation of adverts and marketing embeded in the page' +
                    ' based on your previous activities and demographics',
            req:    false,
            used:   false
          }
        }
      }
    },
    add_type: function( code, title, text, thirdparty, req ) { /* PUBLIC */
      this.types[ thirdparty ? 'th' : 'fi' ].cookies[ code ] =
        { title: title, text: text, req: req, used: true };
      return this;
    },
    reset_types: function() {
      var i,f=this.types.fi.cookies,t=this.types.th.cookies;
      for( i in f ) {
        if( f.hasOwnProperty( i ) ) {
          f[i].used = false;
        }
      }
      for( i in t ) {
        if( t.hasOwnProperty( i ) ) {
          t[i].used = false;
        }
      }
      return this;
    },
    _types: function( a, fl ) { // Turn on (fl=true) or off (fl=false) cookie types
      var i,f=this.types.fi.cookies,t=this.types.th.cookies;
      if( Array.isArray(a[0]) ) {
        a=a[0];
      }
      for( i = a.length; i; ) {
        i--;
        if( f.hasOwnProperty( a[i] ) ) {
          f[ a[i] ].used = fl;
        }
        if( t.hasOwnProperty( a[i] ) ) {
          t[ a[i] ].used = fl;
        }
      }
      return this;
    },
    set_types: function( ) { /* PUBLIC */
      return this._types( arguments, true );
    },
    clear_types: function( ) { /* PUBLIC */
      return this._types( arguments, false );
    },
    // Extra information req to include in options footer AND/OR disable tracking...
    url:    '/cookiespolicy.html',
    ga:     '',
    set_policy_url: function( string ) { /* PUBLIC */
      this.url = string;
      return this;
    },
    set_ga_code: function( string ) { /* PUBLIC */
      this.ga  = string;
      return this;
    },
    // Display functions... footer footer message & footer options panel...
    footer: function () { /* PUBLIC */
      if( this.state === '' ) { // Initial footer is full width with text + 2 buttons
        document.body.innerHTML = document.body.innerHTML                        +
          '<div class="full" id="cookie-policy">'                                +
          '<p>We use cookies to enable functionality on our website and'         +
            ' track usage. <button id="cookie-accept">Accept cookies</button>'   +
            ' <button id="cookie-settings">Cookie settings</button></div>'       ;
      } else { // Otherwise it is a small button - in "bottom right" - can be changed with CSS
        document.body.innerHTML = document.body.innerHTML                        +
          '<div id="cookie-policy"><button id="cookie-settings">Cookies and privacy</button></div>';
      }
      return this.enable_actions();
    },
    _rm: function( id ) { // Remove a node from the DOM...
      var e = document.getElementById( id );
      if( e ) {
        e.parentNode.removeChild(e);
      }
      return this;
    },
    clear: function () {
      return this._rm( 'cookie-policy' )._rm( 'cookie-options' );
    },
    cookie_table: function ( conf ) {
      var markup = '',k,cn;
      for( k in conf.cookies ) {
        if( conf.cookies.hasOwnProperty( k ) ) {
          cn = conf.cookies[k];
          if( cn.used ) {
            markup += '<tr id="cookie-' + k + '"' +
                      ( ( k === 't1' || k === 't3' ) && this.track === false ?
                        ' class="disabled" title="You will not be tracked as you have "Do Not Track" enabled in your browser"' : '' ) +
                      '><td><label for="cookie-input-' + k + '"><strong>' + cn.title + '</strong><br />' +
                      cn.text + '</label></td><td>' +
                      ( cn.req ? 'Required <input type="hidden" />' :
                        '<input id="cookie-input-' + k + '" type="checkbox" '+(this.is_set(k)?' checked="checked"':'' )+' />' ) +
                      '</td></tr>';
          }
        }
      }
      if( markup === '' ) {
        return '';
      }
      return '<table><thead><tr><th colspan="2">' + conf.caption  +
        '</th></tr></thead><tbody>' + markup + '</tbody></table>' ;
    },
    options: function () {
      var action_string = this.state === 'seen' ? 'Set' : 'Update';
      document.body.innerHTML = document.body.innerHTML + '<div id="cookie-options">'        +
        '<button id="cookie-close">Close</button><h2>Cookies and privacy</h2>'               +
        '<p>We use cookies to enable functionality within our website and track usage.</p>'  +
        '<p>Below you can choose the types of cookies we set in your browser - or you can'   +
        ' click the "accept all cookies" button to accept all our cookies.</p>'              +
        '<p>For further information on cookies set on this server please read our <a href="' +
        this.url + '">full cookie policy</a></p>'                                            +
        '<blockquote><button id="cookie-accept">Accept all cookies</button></blockquote>'    +
        '<h3>Cookie preferences</h3>'                                                        +
        this.cookie_table( this.types.fi ) + this.cookie_table( this.types.th )              +
        '<blockquote><button id="cookie-update">' + action_string                            +
        ' preferences</button></blockquote>'                                                 +
        '</div>'                                                                             ;
      // Now turn on the functionality of the buttons ... see code below!
      return this.enable_actions();
    },
    // Turn on and define button actions .....
    enable_actions: function() {
      var self = this, e;
      // Accept all....
      e = d.getElementById( 'cookie-accept' );
      if( e ) {
        e.onclick = function () {
          // Need to loop through both hashes!
          var a = [ 'seen' ], f = self.types.fi.cookies, t = self.types.th.cookies, k;
          for( k in f ) {
            if( f.hasOwnProperty( k ) && f[ k ].used ) {
              a.push( k );
            }
          }
          for( k in t ) {
            if( t.hasOwnProperty( k ) && t[ k ].used ) {
              a.push( k );
            }
          }
          self.state = a.join('-');
          self.set().clear().footer();
        };
      }
      // Show cookie settings "dialog"
      e = d.getElementById( 'cookie-settings' );
      if( e ) {
        e.onclick = function(){
          if( self.state === '' ) {
            self.state = 'seen';
          }
          self.set().clear().options();
        };
      }
      // Update the states of cookie flags!
      e = d.getElementById( 'cookie-update' );
      if( e ) {
        e.onclick = function(){ // jQuery...
          var a = [ 'seen' ],
              r = d.getElementById( 'cookie-options' ).querySelectorAll('tr'),
              i, inp;
          for( i = r.length; i ; ) {
            i--;
            inp = r[i].querySelector( 'input' );
            if( inp && (inp.getAttribute('type') === 'hidden' || inp.checked ) ) {
              a.push( r[i].getAttribute( 'id' ).substr(7) );
            }
          }
          self.state = a.join('-');
          self.set().clear().footer();
        };
      }
      // Close the dialog without saving!
      e = d.getElementById( 'cookie-close' );
      if( e ) {
        e.onclick = function(){
          self.clear().footer();
        };
      }
      return this;
    },
    // Test to see if particular string is part state string....
    is_set: function( string ) { /* PUBLIC */
      return this.state.indexOf( string ) >= 0;
    },
    // Code to disable tracking cookies if requested by user....
    tracking: function() { /* PUBLIC */
      // Either we have not set first party tracking or DNT is on!
      if( ! this.is_set('t1') || this.track === false ) {
        // Disable piwik
        w._paq = w._paq || [];              // make _paq unless it exists!
        w._paq.push( ['disableCookies'] );  // Add flag to disable cookies!
      }
      // Either we have not set third party tracking or DNT in on!
      if( this.ga !== '' && (! this.is_set('t3') || this.track === false) ) {
        // Disable google analytics
        w[ 'ga-disable-' + this.ga ] = true;
      }
      return this;
    }
  };
})(navigator,window,document);

CookiePolicy.init().parse_meta().footer().tracking();
/*
Example usage template

  CookiePolicy
    // .set_policy_url( '/test' )  // Set policy URL
    // .set_ga_code( 'test!' )     // Set the google analytics code
    // .set_types('t3','f3');       // Add in 3rd party functional and tracking cookies

*/
