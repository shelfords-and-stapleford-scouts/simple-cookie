<?php
/*
+----------------------------------------------------------------------
| Copyright (c) 2018 Genome Research Ltd.
| This is part of the Wellcome Sanger Institute extensions to
| WordPress.
+----------------------------------------------------------------------
| This extension to Worpdress is free software: you can redistribute
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

Simple cookie code to create a simple PECR (note not GDPR as that has
nothing to do with cookies - unless you store personal information in
them like JWT!) cookie compliance...

Note we don't use PHPdoc style comments as that is the best way to make
code unmaintainable - and ****! This is good simple self-documenting
code which doesn't need any comments to mess it up!

Author         : js5
Maintainer     : js5
Created        : 2018-02-09
Last modified  : 2018-02-12

 * @package   SimpleCookie
 * @author    JamesSmith james@jamessmith.me.uk
 * @license   GLPL-3.0+
 * @link      https://jamessmith.me.uk/base-theme-class/
 * @copyright 2018 James Smith
 *
 * @wordpress-plugin
 * Plugin Name: Simple cookie..
 * Plugin URI:  https://jamessmith.me.uk/simple-cookie/
 * Description: Simple javascript/css PECR compliant cookie module..
 * Version:     0.0.1
 * Author:      James Smith
 * Author URI:  https://jamessmith.me.uk
 * Text Domain: simple-cookie-locale
 * License:     GNU Lesser General Public v3
 * License URI: https://www.gnu.org/licenses/lgpl.txt
 * Domain Path: /lang
 */

if( 1 ) { // Set to 0 to use uncompressed css/js [ for debugging ]
  define( 'COOKIE_CSS', 'cookies-min.css' );
  define( 'COOKIE_JS',  'cookies-gcc.js' );
} else {
  define( 'COOKIE_CSS', 'cookies.css' );
  define( 'COOKIE_JS',  'cookies.js' );
}

class SimpleCookie {
/* This is just really for namespacing... as the only call needed is the
   initializer - so to implement this run...
   new SimpleCookie(); */
  public function __construct() {
    add_action(   'admin_init',            [ $this, 'mysettings'      ] );
    add_action(   'admin_enqueue_scripts', [ $this, 'admin_scripts'   ] );
    add_action(   'wp_enqueue_scripts',    [ $this, 'enqueue_scripts' ], - PHP_INT_MAX );  // First scripts/styles to queue!
    add_action(   'wp_head',               [ $this, 'set_meta_tags'   ] );
    if( is_admin() ) {
      add_action( 'admin_menu',            [ $this, 'admin_menu'      ] );
    }
  }

  // Set up options to allow edit form to update values....
  public function mysettings() {
    register_setting( 'simplecookie', 'simplecookie_active',    [ 'default' => 'yes' ] );
    register_setting( 'simplecookie', 'simplecookie_ga_code'    );
    register_setting( 'simplecookie', 'simplecookie_types',     [
      'default' => 'f1 t1',
      'sanitize_callback' => function( $input ) {
        return is_array( $input ) ? implode( $input, ' ' ) : $input;
      }
    ] );
    register_setting( 'simplecookie', 'simplecookie_policy',    [ 'default' => ''] );       // Default to privacy page as defined by WordPress
    register_setting( 'simplecookie', 'simplecookie_custom_js'  );
    register_setting( 'simplecookie', 'simplecookie_custom_css' );
  }

  // Add CSS to admin page - to format checkbox as 2x3 array rather an a long list...
  public function admin_scripts() {
    wp_enqueue_style(  'simple-cookie-admin', '/wp-content/plugins/simple-cookie/extra-form.css', [], null, false );
  }

  // Add CSS/JS + additional CSS/JS into head/foot of page respectively...
  public function enqueue_scripts() {
    // Push styles into header...
    if( get_option('simplecookie_active') !== 'no' ) {
      wp_enqueue_style(     'simple-cookie',      '/wp-content/plugins/simple-cookie/'.COOKIE_CSS,               [], null, false );
      if( get_option( 'simplecookie_custom_css' ) ) {
        wp_enqueue_style(   'simple-cookie-cust', get_theme_file_uri( get_option( 'simplecookie_custom_css' ) ), [], null, false );
      }
      wp_enqueue_script(    'simple-cookie',      '/wp-content/plugins/simple-cookie/'.COOKIE_JS,                [], null, true  );
      if( get_option( 'simplecookie_custom_js' ) ) {
        wp_enqueue_script(  'simple-cookie-cust', get_theme_file_uri( get_option( 'simplecookie_custom_js'  ) ), [], null, true  );
      }
    }
  }

  // Add additonal meta tags to header - these are read by the javascript and allow us to pass settings for the cookie
  // code without the need for custom javascript.. 
  public function set_meta_tags() {
    if( get_option( 'simplecookie_ga_code' ) ) {
      echo '<meta name="simplecookie_ga_code" content="',esc_html( get_option( 'simplecookie_ga_code' ) ),'" />',"\n";
    }
    if( get_option( 'simplecookie_policy' ) ) {
      echo '<meta name="simplecookie_policy"  content="',esc_html( get_option( 'simplecookie_policy' ) ),'" />',"\n";
    } elseif( get_option( 'wp_page_for_privacy_policy' ) ) {
      $p = get_post( get_option( 'wp_page_for_privacy_policy' ) );
      if( $p ) {
        echo '<meta name="simplecookie_policy"  content="/',esc_html( $p->post_name ),'/" />',"\n";
      }
    }
    if( get_option( 'simplecookie_types' ) ) {
      echo '<meta name="simplecookie_types"   content="',esc_html( get_option( 'simplecookie_types' ) ),'" />',"\n";
    }
  }

  // Add link to the following options form page in menu!
  public function admin_menu() {
    add_options_page( 'Simple cookie', 'Simple cookie', 'administrator', 'Simple cookie', [ $this, 'options_form' ] );
  }

  // Now generate the administration form...
  public function options_form() {
    $act         = get_option(    'simplecookie_active' );
    $tps         = preg_split(    '/\s+/', get_option('simplecookie_types'), 0, PREG_SPLIT_NO_EMPTY );
    $types_array = [
      'f1' => 'Own functional',
      'f3' => '3rd party functional',
      't1' => 'Own tracking',
      't3' => '3rd party tracking',
      'm1' => 'Own marketing',
      'm3' => '3rd party marketing',
    ];
?>
  <div>
    <h2>Simple Cookie Options</h2>
    <p>
      This inteface allows you to set the options for the EU PECR complient cookie code.
      Note to add cookie types and make whatever other adjustments you want you will have
      to create a custom javascript module (and include below) to make those changes.
    </p>
    <p>
      Please note to store users preferences about cookies we in turn have to set a cookie
      in the user's browser. This cookie is <strong><oode>CookiePolicy</code></strong> and
      contains the types of cookies the user has agreed to display.
    <form method="post" action="options.php">
<?php
    settings_fields(      'simplecookie'        );
    do_settings_sections( 'simplecookie'        );
?>
      <table class="form-table simplecookie">
        <tr>
          <th>Cookie popup active?</th>
          <td>
            <select name="simplecookie_active" id="simplecookie_active">
              <option <?php echo 'no' !== $act ? 'selected="selected" ' : ''; ?>value="yes">Popup active</option>
              <option <?php echo 'no' === $act ? 'selected="selected" ' : ''; ?>value="no" >Popup inactive</option>
            </select>
          </td>
        </tr>
        <tr>
          <th>Cookie GA code:</th>
          <td>
            <input class="regular-text code" name="simplecookie_ga_code" type="text" id="simplecookie_ga_code"
                   value="<?php echo esc_html(get_option('simplecookie_ga_code')); ?>" pattern="^(UA-\d{4,9}-\d{1,4})?$"
                   title="Valid format is UA-{4-9 digits}-{1-4 digits}" /><br />
            Leave blank if you do not use Google Analytics (format: UA-xxx-yyyy)
          </td>
        </tr>
        <tr>
          <th>Cookie policy URL:</th>
          <td>
            <input class="regular-text code" name="simplecookie_policy" type="text" id="simplecookie_policy"
                   value="<?php echo esc_html(get_option('simplecookie_policy')); ?>" /><br />
            Leave blank to use the privacy policy defined by WordPress (See <a href="/wp-admin/privacy.php">Settings &gt; privacy</a> )
          </td>
        </tr>
        <tr>
          <th>Cookie types:</th>
          <td>
            <ul>
<?php
    foreach( $types_array as $k => $v ) {
      echo '              <li><label><input value="',esc_html($k),'" type="checkbox" name="simplecookie_types[]" id="simplecookie_types_',esc_html($k),'"',
        in_array( $k, $tps, true ) ? ' checked="checked"' : '',' /> ',esc_html( $v ),'</label></li>',"\n";
    }
?>
            </ul>
            <p>Check any cookie types you use on your server.</p>
          </td>
        </tr>
        <tr>
          <th>Cookie js path:</th>
          <td>
            <input class="regular-text code" name="simplecookie_custom_js" type="text" id="simplecookie_custom_js"
                   value="<?php echo esc_html(get_option('simplecookie_custom_js')); ?>" pattern="^(.*[.]js)?$"
                   title="Must end in .js" /><br />
            Path relative to your theme directory of custom javascript [Allows over-rides and re-configuration beyond what the prebious 3 options enable]
          </td>
        </tr>
        <tr>
          <th>Cookie CSS path:</th>
          <td>
            <input class="regular-text code" name="simplecookie_custom_css" type="text" id="simplecookie_custom_css"
                   value="<?php echo esc_html(get_option('simplecookie_custom_css')); ?>" pattern="^(.*[.]css)?$"
                   title="Must end in .css" /><br />
            Path relative to your theme directory of custom css
          </td>
        </tr>
      </table>
<?php
    submit_button();
?>
    </form>
  </div>
<?php
  }
}

new SimpleCookie();  // Initialize cookie code!
