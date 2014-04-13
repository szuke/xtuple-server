(function () {
  'use strict';

  /**
   * Mobile-ize the main databases
   */
  var build_main = exports;

  var task = require('../../lib/task'),
    format = require('string-format'),
    path = require('path'),
    _ = require('underscore'),
    rimraf = require('rimraf'),
    fs = require('fs'),
    pgcli = require('../../lib/pg-cli'),
    exec = require('execSync').exec,
    sync = require('sync'),
    build = require('../../lib/xt/build');

  _.extend(build_main, task, /** @exports build_main */ {

    options: {
      pilot: {
        optional: '[boolean]',
        description: 'Additionally create a pilot area using a copy of the main database',
        value: true
      },
      edition: {
        optional: '[string]',
        description: 'The xTuple Edition to install',
        value: 'core'
      }
    },

    /** @override */
    beforeTask: function (options) {
      require('./build_common').beforeTask(options);
    },

    /** @override */
    doTask: function (options) {
      var xt = options.xt,
        extensions = build.editions[xt.edition],
        databases = _.where(xt.database.list, { main: true });

      console.log('admin pw: '+ options.xt.adminpw);

      // build the main database and pilot, if specified
      _.each(databases, function (db) {
        rimraf.sync(path.resolve(options.xt.coredir, 'scripts/lib/build'));

        var buildResult = exec(build.getCoreBuildCommand(db, options));
        console.log(buildResult);
        if (buildResult.code !== 0) {
          throw new Error(buildResult.stdout);
        }

        // install extensions specified by the edition
        _.each(extensions, function (ext) {
          var result = exec(build.getExtensionBuildCommand(db, options, ext));
          if (result.code !== 0) {
            throw new Error(result.stdout);
          }
        });
      });

      // XXX it is not clear to me whether this is necessary, but it doesn't
      // hurt anything
      //pgcli.psql(options, 'ALTER USER admin WITH PASSWORD {xt.adminpw}'.format(options));
    },

    /** @override */
    afterTask: function (options) {
      require('./build_common').afterTask(options);
    }
  });
})();
