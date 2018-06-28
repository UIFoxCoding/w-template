const gulp = require('gulp');
const postcss = require('gulp-postcss');
const browserSync = require('browser-sync');
const mqPacker = require('css-mqpacker');
const sass = require('gulp-sass');
const del = require('del');
const pug = require('gulp-pug');
const rename = require('gulp-rename');
const combineDuplicated = require('postcss-combine-duplicated-selectors');
const fontMagician = require('postcss-font-magician');
const autoprefixer = require('autoprefixer');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const cache = require('gulp-cache');
const sorting = require('postcss-sorting');
const imageminJpegRecompress = require('imagemin-jpeg-recompress');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const babel = require('gulp-babel');
const autoreset = require('postcss-autoreset');
const plumber = require('gulp-plumber');
const uncss = require('postcss-uncss');
const cssMin = require('gulp-cssmin');
const critical = require('critical').stream;
const postcssNormalize = require('postcss-normalize');

/*=========================
SERVER
=========================*/

gulp.task('server', () => {
    browserSync.init({
        server: {
            baseDir: './build'
        }
    });
});


/*=========================
PATHS
=========================*/

const path = {
    vendors: {
        js: [ // path to js vendor files. Do not recommend to include in pug templates, only there
            'bower_components/jquery/dist/jquery.slim.js',
            'bower_components/bootstrap/dist/js/bootstrap.js',
            'bower_components/slick/dist/slick.js',
        ],
        css: [// path to css vendor files
            'bower_components/bootstrap/dist/css/bootstrap-grid.css',
            // 'bower_components/normalize-css/normalize.css',
        ]
    },
    //path to build folders
    build: {
        base: "build/",
        js: "build/js/",
        css: "build/css/",
        images: "build/images/",
        fonts: "build/webfonts/",
    },
    //path to source folders
    src: {
        pug: "src/pages/*.pug",
        js: "src/js/**/*.js",
        sass: ["src/styles/main.scss"],
        images: "src/images/**/*.*",
        fonts: "src/fonts/**/*.*",
    },
    //path to files for watching
    watch: {
        html: "src/pages/**/*.pug",
        js: "src/js/**/*.js",
        sass: "src/styles/**/*.scss",
        images: "src/images/**/*.*",
        fonts: "src/fonts/**/*.*",
    },

};


/*=========================
HTML
 =========================*/

gulp.task('html:development', () => {
    return gulp.src(path.src.pug)
        .pipe(plumber())
        .pipe(pug({
            pretty: true
        }))
        .pipe(gulp.dest(path.build.base))
        .pipe(browserSync.reload({stream: true}))
});

gulp.task('html:production', () => {
    return gulp.src(path.src.pug)
        .pipe(plumber())
        .pipe(pug())
        .pipe(gulp.dest(path.build.base))
});


/*=========================
Styles
 =========================*/
//postcss have 2 config files - for development and for production. Be carefull to edit it
const postcssConfig = {
    development: {
        css: [
            postcssNormalize({
                browsers: 'last 2 versions' // put there your browserlist setting
            }),
            autoprefixer(),
            fontMagician(),
            autoreset({
                reset: {
                    // put there parameters that you usually put in *{} selector
                    'box-sizing': 'border-box', 
                }
            }),
        ],
        vendors: [
            combineDuplicated({
                removeDuplicatedProperties: true
            }),
            mqPacker({
                sort: true//set to false if you want to not join duplicated mediaqueries
            }),
        ]
    },
    production: {
        css: [
            postcssNormalize(),
            autoprefixer(),
            combineDuplicated({
                removeDuplicatedProperties: true
            }),
            fontMagician(),
            mqPacker({
                sort: true
            }),
            sorting({
                // you can edit order of css properties in build css files
                'properties-order': [

                    'position',
                    'top',
                    'right',
                    'bottom',
                    'left',
                    'z-index',

                    'display',
                    'float',
                    'width',
                    'height',
                    'margin',
                    'padding',

                    'font',
                    'font-style',
                    'font-size',
                    'line-height',
                    'font-family',
                    'text-align',
                    'color',

                    'background',
                    'background-color',
                    'border',
                    'border-radius',
                    'opacity',

                    'transition',
                ],
                'unspecified-properties-position': 'bottomAlphabetical'
            }),
            //uncss remove unnecessary selectors. Be carefull.
            uncss({
                // IMPORTANT: put there path to all ypur html files in build folder
                //
                html: ['build/*.html'],
                // ignore: [] // uncomment and put there rules you want to ignore
            }),
            autoreset({
                reset: {
                    'box-sizing': 'border-box'
                }
            }),
        ],
        vendors: [
            combineDuplicated({
                removeDuplicatedProperties: true
            }),
            mqPacker({
                sort: true
            }),
        ]
    },

};

gulp.task('styles:development', () => {
    return gulp.src(path.src.sass)
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(postcss(postcssConfig.development.css))
        // .pipe(cssMin())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(path.build.css))
        .pipe(browserSync.reload({stream: true}))
});

gulp.task('styles:production', () => {
    return gulp.src(path.src.sass)
        .pipe(plumber())
        .pipe(sass())
        .pipe(postcss(postcssConfig.production.css))
        .pipe(cssMin())
        .pipe(gulp.dest(path.build.css))
});

gulp.task('styles:vendor', () => {
    return gulp.src(path.vendors.css)
        .pipe(plumber())
        .pipe(concat('vendor.css'))
        .pipe(postcss(postcssConfig.production.vendors))
        .pipe(cssMin())
        .pipe(gulp.dest(path.build.css))
});


/*=========================
Process critical style rules
 =========================*/

let criticaConfig = {
    base: path.build.base,
    inline: true,
    css: [
    //put here  paths to all style files in your build directory
        'build/css/main.css',
        'build/css/vendor.css'
    ],
    dimensions: [
    // config screen sizes for calculate critical css
    //you can write multiple of them, like in current config
        {
            width: 1366,
            height: 768
        },
        {
            width: 1920,
            height: 1080
        }
    ]
};
gulp.task('critical', () => {
    return gulp.src('build/*.html') // put here path to all html in build directory
        .pipe(plumber())
        .pipe(critical(criticaConfig))
        // .on('error', (err) => log.error(err.message))
        .pipe(gulp.dest('build'))
});
/*=========================
js
 =========================*/
gulp.task('scripts:vendor', () => {
    return gulp.src(path.vendors.js)
        .pipe(plumber())
        .pipe(concat('vendor.js'))
        .pipe(uglify())
        .pipe(gulp.dest(path.build.js))
});

gulp.task('scripts:development', () => {
    return gulp.src(path.src.js)
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ['env']
        }))
        .pipe(uglify())
        .pipe(concat('scripts.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(path.build.js))
        .pipe(browserSync.reload({stream: true}))
});

gulp.task('scripts:production', () => {
    return gulp.src(path.src.js)
        .pipe(plumber())
        .pipe(concat('scripts.js'))
        .pipe(babel({
            presets: ['env']
        }))
        .pipe(uglify())
        .pipe(gulp.dest(path.build.js))
});


/*=========================
IMAGES | Using cache, don't need to development/production config
 =========================*/

gulp.task('images', () => {
    return gulp.src(path.src.images)
        .pipe(plumber())
        .pipe(cache(imagemin([ 
            // optimal image optimizing, change if you know what to do
            imagemin.gifsicle({interlaced: true}),
            imagemin.jpegtran({progressive: true}),
            imageminJpegRecompress({
                loops: 5,
                min: 65,
                max: 70,
                quality: 'medium'
            }),
            imagemin.svgo(),
            imagemin.optipng({optimizationLevel: 3}),
            pngquant({quality: '65-70', speed: 5})
        ], {
            verbose: true
        })))
        .pipe(rename({dirname: ''}))
        .pipe(gulp.dest(path.build.images))
        .pipe(browserSync.reload({stream: true}))
});


/*=========================
FONTS
 =========================*/

gulp.task('fonts', () => {
    return gulp.src([path.src.fonts])
        .pipe(plumber())
        .pipe(gulp.dest(path.build.fonts))
        .pipe(browserSync.reload({stream: true}))
});


/*=========================
CLEAN
 =========================*/

gulp.task('clean:cache', function (done) {
    return cache.clearAll(done);
});

gulp.task('clean:dist', (done) => {
    del(path.build.base);
    done();
});

gulp.task('clean', gulp.parallel('clean:cache', 'clean:dist'));


/*=========================
WATCHERS
 =========================*/

gulp.task('watch:fonts', () => {
    return gulp.watch(path.watch.fonts, gulp.series('fonts'));
});
gulp.task('watch:code', () => {
    return gulp.watch([path.watch.sass, path.vendors.css, path.watch.html], gulp.series('html:development', 'styles:development'));
});
gulp.task('watch:scripts', () => {
    return gulp.watch(path.watch.js, gulp.series('scripts:development'));
});
gulp.task('watch:images', () => {
    return gulp.watch(path.watch.images, gulp.series('images'));
});

gulp.task('watch', gulp.parallel('watch:fonts', 'watch:code', 'watch:scripts', 'watch:images', 'server'));


/*=========================
BUILD
 =========================*/

gulp.task('build:production', gulp.series('fonts', 'html:production', 'scripts:vendor', 'scripts:production', 'styles:vendor', 'images', 'styles:production', 'critical'));

gulp.task('build:development', gulp.series('fonts', 'html:development', 'scripts:vendor', 'scripts:development', 'styles:vendor', 'images', 'styles:development'));


/*=========================
DEFAULT(WATCH)
 =========================*/

gulp.task('default', gulp.series('build:development', 'watch'));


