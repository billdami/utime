module.exports = function(grunt) {

    grunt.initConfig({
        'pkg': grunt.file.readJSON('package.json'),
        'uglify': {
            'dist': {
                options: { 
                    preserveComments: false
                },
                files: {
                    'dist/utime-popup.js': ['js/utime.js', 'js/popup.js'],
                    'dist/utime-background.js': ['js/utime.js', 'js/background.js']
                }
            }
        },
        'concat': {
            'libs': {
                options: {
                    stripBanners: true,
                    banner: '/*!\n'+
                            ' * <%= pkg.name %>\n'+
                            ' * Last updated: <%= grunt.template.today("mm-dd-yyyy") %>\n'+
                            ' * Author: <%= pkg.author %>\n'+
                            ' */\n' 
                },
                files: {
                    'dist/utime-popup.js': ['libs/jquery.js', 'libs/date.js', 'dist/utime-popup.js'],
                    'dist/utime-background.js': ['libs/jquery.js', 'libs/date.js', 'dist/utime-background.js']
                }
            },
            'dev': {
                files: {
                    'dist/utime-popup.js': ['js/utime.js', 'js/popup.js', 'js/options.js'],
                    'dist/utime-background.js': ['js/utime.js', 'js/background.js']
                }
            },
        },
        'less': {
            'dev': {
                files: { 
                    'dist/utime.css': 'less/utime.less' 
                }
            },
            'dist': {
                options: {
                    cleancss: true
                },
                files: { 
                    'dist/utime.css': 'less/utime.less' 
                }
            }
        },
        'watch': {
            'js': {
                files: ['js/*.js'],
                tasks: ['concat:dev', 'concat:libs']
            },
            'less': {
                files: ['less/*.less'],
                tasks: ['less:dev']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['uglify:dist', 'concat:libs', 'less:dist']);
    grunt.registerTask('css', ['less:dist']);
    grunt.registerTask('js', ['uglify:dist', 'concat']);
};