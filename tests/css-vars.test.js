// Dependencies
// =============================================================================
import chai               from 'chai';
import createTestElms     from './helpers/create-test-elms';
import cssVars            from '../src/index';
import resetVariableStore from './helpers/reset-variablestore';
import { expect }         from 'chai';

chai.use(require('chai-colors'));

// Make cssVars available from console for adhoc tests
window.cssVars = cssVars;


// Constants & Variables
// =============================================================================
const bodyComputedStyle        = getComputedStyle(document.body);
const hasAnimationSupport      = bodyComputedStyle.animationName || bodyComputedStyle.mozAnimationName || bodyComputedStyle.webkitAnimationName;
const hasCustomPropertySupport = window.CSS && window.CSS.supports && window.CSS.supports('(--a: 0)');


// Suite
// =============================================================================
describe('css-vars', function() {
    // Hooks
    // -------------------------------------------------------------------------
    // Conditionally include web component+polyfill to avoid errors in IE < 11
    before(function() {
        const hasWebComponentSupport = () => 'customElements' in window;
        const isIELessThan11 = navigator.userAgent.indexOf('MSIE') !== -1;
        const isJSDOM        = navigator.userAgent.indexOf('jsdom') !== -1;

        if (!hasWebComponentSupport() && !isIELessThan11 && !isJSDOM) {
            console.log('*** Injected: Web Component Polyfill ***');

            require('@webcomponents/webcomponentsjs/webcomponents-bundle.js');
        }

        if (hasWebComponentSupport()) {
            console.log('*** Injected: Web Component ***');

            require('./helpers/inject-test-component.js')();
        }
    });

    // Remove <link> and <style> elements added for each test
    beforeEach(function() {
        const testNodes = document.querySelectorAll('[data-cssvars],[data-test]');

        for (let i = 0; i < testNodes.length; i++) {
            testNodes[i].parentNode.removeChild(testNodes[i]);
        }

        resetVariableStore();
    });

    // Tests: Stylesheets
    // -------------------------------------------------------------------------
    describe('Stylesheets', function() {
        it('handles <style> elements', function(done) {
            const styleCss  = `
                :root { --color: red; }
                p { color: var(--color); }
            `;
            const expectCss = 'p{color:red;}';

            createTestElms({ tag: 'style', text: styleCss });

            cssVars({
                include    : '[data-test]',
                onlyLegacy : false,
                incremental: false,
                onComplete(cssText, styleNode, cssVariables, benchmark) {
                    expect(cssText).to.equal(expectCss);
                    done();
                }
            });
        });

        it('handles <link> elements', function(done) {
            const linkUrl1  = '/base/tests/fixtures/test-declaration.css';
            const linkUrl2  = '/base/tests/fixtures/test-value.css';
            const expectCss = 'p{color:red;}';

            createTestElms([
                { tag: 'link', attr: { rel: 'stylesheet', href: linkUrl1 } },
                { tag: 'link', attr: { rel: 'stylesheet', href: linkUrl2 } }
            ]);

            cssVars({
                include    : '[data-test]',
                onlyLegacy : false,
                incremental: false,
                onComplete(cssText, styleNode, cssVariables, benchmark) {
                    expect(cssText).to.equal(expectCss);
                    done();
                }
            });
        });

        it('handles <link> and <style> elements', function(done) {
            const linkUrl1  = '/base/tests/fixtures/test-declaration.css';
            const linkUrl2  = '/base/tests/fixtures/test-value.css';
            const styleCss  = `
                @import url("${linkUrl2}");
                @import url("${linkUrl1}");
                p { color: var(--color); }
            `;
            const expectCss = 'p{color:red;}p{color:red;}p{color:red;}';

            createTestElms([
                { tag: 'link', attr: { rel: 'stylesheet', href: linkUrl1 } },
                { tag: 'link', attr: { rel: 'stylesheet', href: linkUrl2 } },
                { tag: 'style', text: styleCss }
            ]);

            cssVars({
                include    : '[data-test]',
                incremental: false,
                onlyLegacy : false,
                onComplete(cssText, styleNode, cssVariables, benchmark) {
                    expect(cssText).to.equal(expectCss);
                    done();
                }
            });
        });

        it('handles replacement of CSS placeholders', function(done) {
            const styleCss = `
                :root { --color: red; }
                p { color: var(--color); }
            `;
            const expectCss = `p{color:red;}${'p{color:blue;}'.repeat(5)}`;

            createTestElms([
                { tag: 'style', text: styleCss },
                { tag: 'style', text: 'p { color: blue; }' },
                { tag: 'style', text: 'p { color: blue; }' },
                { tag: 'style', text: 'p { color: blue; }' },
                { tag: 'style', text: 'p { color: blue; }' },
                { tag: 'style', text: 'p { color: blue; }' }
            ]);

            cssVars({
                include    : '[data-test]',
                incremental: false,
                onlyLegacy : false,
                onComplete(cssText, styleNode, cssVariables, benchmark) {
                    expect(cssText.replace(/\s/g,'')).to.equal(expectCss);
                    done();
                }
            });
        });
    });

    // Tests: Options
    // -------------------------------------------------------------------------
    describe('Options', function() {
        if ('customElements' in window) {
            describe('rootElement', function() {
                it('handles Element.shadowRoot <style> elements', function(done) {
                    const customElm  = createTestElms({ tag: 'test-component', attr: { 'data-text': 'Custom Element' } })[0];
                    const shadowRoot = customElm.shadowRoot;
                    const expectCss  = '.test-component{background:red;background:green;color:white;}';

                    createTestElms({ tag: 'style', text: ':root { --test-component-background: green; }' });

                    cssVars({
                        rootElement: shadowRoot,
                        incremental: false,
                        onlyLegacy : false,
                        updateDOM  : false,
                        onComplete(cssText, styleNode, cssVariables, benchmark) {
                            expect(cssText).to.equal(expectCss);
                            done();
                        }
                    });
                });

                it('handles Element.shadowRoot using options.variables', function(done) {
                    const customElm  = createTestElms({ tag: 'test-component', attr: { 'data-text': 'Custom Element' } })[0];
                    const shadowRoot = customElm.shadowRoot;
                    const expectCss  = '.test-component{background:red;background:green;color:white;}';

                    cssVars({
                        rootElement: shadowRoot,
                        incremental: false,
                        onlyLegacy : false,
                        updateDOM  : false,
                        variables  : {
                            '--test-component-background': 'green'
                        },
                        onComplete(cssText, styleNode, cssVariables, benchmark) {
                            expect(cssText).to.equal(expectCss);
                            done();
                        }
                    });
                });
            });
        }

        describe('onlyLegacy', function() {
            this.timeout(5000);

            it('true', function(done) {
                const styleCss  = ':root{--color:red;}p{color:var(--color);}';
                const expectCss = hasCustomPropertySupport ? '' : 'p{color:red;}';

                let onCompleteCount = 0;

                createTestElms({ tag: 'style', text: styleCss });

                cssVars({
                    include    : '[data-test]',
                    incremental: false,
                    onlyLegacy : true,
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        onCompleteCount++;
                        expect(cssText).to.equal(expectCss);
                    }
                });

                setTimeout(function() {
                    expect(onCompleteCount).to.equal(hasCustomPropertySupport ? 0 : 1);
                    done();
                }, 3000);
            });
        });

        // The 'onlyVars' option is used in this module as well as the
        // transfrom-css.js module. Testing how this options is handled by each
        // module is handled in each module's test file.
        describe('onlyVars', function() {
            it('true - filters CSS data', function(done) {
                const expectCss = 'p{color:red;}';

                createTestElms([
                    { tag: 'style', text: ':root { --color: red; }' },
                    { tag: 'style', text: 'p { color: var(--color); }' },
                    { tag: 'style', text: 'p { color: green; }' }
                ]);

                cssVars({
                    include    : '[data-test]',
                    incremental: false,
                    onlyLegacy : false,
                    onlyVars   : true,
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        expect(cssText).to.equal(expectCss);
                        done();
                    }
                });
            });

            it('true - filters CSS declarations (passed to transform-css)', function(done) {
                const styleCss = `
                    :root {--color: red;}
                    p { color: var(--color); }
                    p { color: green; }
                `;
                const expectCss = 'p{color:red;}';

                createTestElms({ tag: 'style', text: styleCss });

                cssVars({
                    include    : '[data-test]',
                    incremental: false,
                    onlyLegacy : false,
                    onlyVars   : true,
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        expect(cssText).to.equal(expectCss);
                        done();
                    }
                });
            });

            it('false - includes all CSS declarations', function(done) {
                const styleCss = `
                    :root {--color: red;}
                    p { color: var(--color); }
                    p { color: green; }
                `;
                const expectCss = 'p{color:red;}p{color:green;}';

                createTestElms({ tag: 'style', text: styleCss });

                cssVars({
                    include    : '[data-test]',
                    incremental: false,
                    onlyLegacy : false,
                    onlyVars   : false,
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        expect(cssText).to.equal(expectCss);
                        done();
                    }
                });
            });
        });

        describe('preserve', function() {
            it('true (passed to transform-css)', function(done) {
                const styleCss  = ':root{--color:red;}p{color:var(--color);}';
                const expectCss = ':root{--color:red;}p{color:red;color:var(--color);}';

                createTestElms({ tag: 'style', text: styleCss });

                cssVars({
                    include    : '[data-test]',
                    incremental: false,
                    onlyLegacy : false,
                    preserve   : true,
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        expect(cssText).to.equal(expectCss);
                        done();
                    }
                });
            });

            it('false (passed to transform-css)', function(done) {
                const styleCss  = ':root{--color:red;}p{color:var(--color);}';
                const expectCss = 'p{color:red;}';

                createTestElms({ tag: 'style', text: styleCss });

                cssVars({
                    include    : '[data-test]',
                    incremental: false,
                    onlyLegacy : false,
                    preserve   : false,
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        expect(cssText).to.equal(expectCss);
                        done();
                    }
                });
            });
        });

        if ('customElements' in window) {
            describe('shadowDOM', function() {
                it('true (handles Element.shadowRoot <style> elements)', function(done) {
                    const styleCss  = ':root { --test-component-background: green; }';
                    const expectCss = '.test-component{background:red;background:green;color:white;}';
                    const testElms  = createTestElms([
                        { tag: 'test-component', attr: { 'data-text': 'Custom Element 1' } },
                        { tag: 'test-component', attr: { 'data-text': 'Custom Element 2' } }
                    ]);

                    let onCompleteCount = 0;

                    createTestElms({ tag: 'style', text: styleCss });

                    cssVars({
                        include    : '[data-test],[data-test-shadow]',
                        incremental: false,
                        onlyLegacy : false,
                        shadowDOM  : true,
                        onComplete(cssText, styleNode, cssVariables, benchmark) {
                            onCompleteCount++;

                            // Test for cssText since test <style> elm with only
                            // :root rule will also trigger callback
                            if (cssText) {
                                expect(cssText).to.equal(expectCss);
                            }
                        }
                    });

                    expect(onCompleteCount).to.equal(testElms.length + 1); // +1 = document
                    done();
                });

                it('true (handles nested Element.shadowRoot <style> elements)', function(done) {
                    const styleCss  = ':root { --test-component-background: green; }';
                    const expectCss = '.test-component{background:red;background:green;color:white;}';
                    const testElm1  = createTestElms({ tag: 'test-component', attr: { 'data-text': 'Custom Element 1' } })[0];

                    let onCompleteCount = 0;

                    createTestElms([
                        { tag: 'style', text: styleCss },
                        { tag: 'test-component', attr: { 'data-text': 'Custom Element 2' }, appendTo: testElm1 }
                    ]);

                    cssVars({
                        rootElement: testElm1,
                        include    : '[data-test],[data-test-shadow]',
                        incremental: false,
                        onlyLegacy : false,
                        shadowDOM  : true,
                        onComplete(cssText, styleNode, cssVariables, benchmark) {
                            if (cssText) {
                                onCompleteCount++;
                                expect(cssText).to.equal(expectCss);
                            }

                            if (onCompleteCount === 2) {
                                done();
                            }
                        }
                    });
                });

                it('false (ignores nested Element.shadowRoot <style> elements)', function(done) {
                    const styleCss  = ':root { --test-component-background: green; }';
                    const expectCss = '.test-component{background:red;background:green;color:white;}';
                    const testElm1  = createTestElms({ tag: 'test-component', attr: { 'data-text': 'Custom Element 1' } })[0];
                    const testElm2  = createTestElms({ tag: 'test-component', attr: { 'data-text': 'Custom Element 2' }, appendTo: testElm1 })[0];

                    createTestElms({ tag: 'style', text: styleCss });

                    cssVars({
                        rootElement: testElm1.shadowRoot,
                        include    : '[data-test],[data-test-shadow]',
                        incremental: false,
                        onlyLegacy : false,
                        shadowDOM  : false,
                        onComplete(cssText, styleNode, cssVariables, benchmark) {
                            expect(styleNode.parentNode).to.equal(this.rootElement);
                            expect(cssText).to.equal(expectCss);
                            expect(testElm2.shadowRoot.querySelector('style[id]')).to.equal(null);
                            done();
                        }
                    });
                });
            });
        }

        describe('updateDOM', function() {
            it('true (appends <style> after last processed element in <head>)', function(done) {
                const testElms = createTestElms([
                    { tag: 'style' },
                    // Not processed by cssVars (used to test insert location)
                    { tag: 'style', attr: { 'data-skip': true }, appendTo: 'body' }
                ]);

                cssVars({
                    include    : '[data-test]:not([data-skip])',
                    incremental: false,
                    onlyLegacy : false,
                    updateDOM  : true,
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        const styleElms = Array.from(document.querySelectorAll('style'));
                        const isAfterLastProcessedElm = testElms[0].nextSibling === styleNode;
                        const isBeforeSkipElm = styleElms.indexOf(styleNode) < styleElms.indexOf(testElms[1]);

                        expect(isAfterLastProcessedElm).to.be.true;
                        expect(isBeforeSkipElm).to.be.true;
                        done();
                    }
                });
            });

            it('true (appends <style> after last processed element in <body>)', function(done) {
                const testElms = createTestElms([
                    { tag: 'style', appendTo: 'body' },
                    // Not processed by cssVars (used to test insert location)
                    { tag: 'style', attr: { 'data-skip': true }, appendTo: 'body' }
                ]);

                cssVars({
                    include    : '[data-test]:not([data-skip])',
                    incremental: false,
                    onlyLegacy : false,
                    updateDOM  : true,
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        const styleElms = Array.from(document.querySelectorAll('style'));
                        const isAfterLastProcessedElm = testElms[0].nextSibling === styleNode;
                        const isBeforeSkipElm = styleElms.indexOf(styleNode) < styleElms.indexOf(testElms[1]);

                        expect(isAfterLastProcessedElm).to.be.true;
                        expect(isBeforeSkipElm).to.be.true;
                        done();
                    }
                });
            });

            it('false (does not modify <style> textContent)', function(done) {
                const styleCss  = ':root{ --color: red; } p{ color: var(--color); }';
                const expectCss = 'p{color:red;}';

                createTestElms({ tag: 'style', text: styleCss });

                cssVars({
                    include    : '[data-test]',
                    incremental: false,
                    onlyLegacy : false,
                    updateDOM  : false,
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        expect(cssText, 'cssText').to.equal(expectCss);
                        expect(styleNode, 'styleNode').to.equal(null);
                        done();
                    }
                });
            });
        });

        describe('updateURLs', function() {
            it('true - updates relative url(...) paths to absolute URLs', function(done) {
                const baseUrl   = location.href.replace(/\/(?:context|debug).html/, '');
                const styleCss  = '@import "/base/tests/fixtures/test-urls.css";';
                const expectCss = `
                    p {
                        background: url(${baseUrl}/base/tests/fixtures/a/image.jpg);
                    }

                    p {
                        background: url(${baseUrl}/base/tests/fixtures/a/b/image.jpg);
                    }

                    p {
                        color: red;
                        background: url(${baseUrl}/base/tests/fixtures/image.jpg);
                        background: url('${baseUrl}/base/tests/fixtures/image.jpg');
                        background: url("${baseUrl}/base/tests/fixtures/image.jpg");
                        background: url(${baseUrl}/base/tests/fixtures/image1.jpg) url('${baseUrl}/base/tests/fixtures/image2.jpg') url("${baseUrl}/base/tests/fixtures/image3.jpg");
                        background: url(data:image/gif;base64,IMAGEDATA);
                    }
                `.replace(/\n|\s/g, '');

                createTestElms({ tag: 'style', text: styleCss });

                cssVars({
                    include    : '[data-test]',
                    incremental: false,
                    onlyLegacy : false,
                    updateURLs : true,
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        expect(cssText.replace(/\n|\s/g, '')).to.equal(expectCss);
                        done();
                    }
                });
            });

            it('false - does not update relative url(...) paths', function(done) {
                const styleCss  = 'p{background:url(image.png);}';
                const expectCss = styleCss;

                createTestElms({ tag: 'style', text: styleCss });

                cssVars({
                    include    : '[data-test]',
                    incremental: false,
                    onlyLegacy : false,
                    updateURLs : false,
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        expect(cssText).to.equal(expectCss);
                        done();
                    }
                });
            });
        });

        describe('variables', function() {
            it('updates values via generated CSS', function(done) {
                const styleCss  = `
                    :root{ --color1: black; }
                    p { color: var(--color1); }
                    p { color: var(--color2); }
                    p { color: var(--color3); }
                    p { color: var(--color4); }
                `;
                const expectCss = 'p{color:red;}p{color:green;}p{color:blue;}p{color:purple;}';

                createTestElms({ tag: 'style', text: styleCss });

                cssVars({
                    include    : '[data-test]',
                    incremental: false,
                    onlyLegacy : false,
                    variables  : {
                        color2    : 'green',  // No leading --
                        '-color3' : 'blue',   // Malformed
                        '--color4': 'purple', // Leading --
                        '--color1': 'red'     // Override
                    },
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        expect(cssText).to.equal(expectCss);
                        done();
                    }
                });
            });
        });

        if (hasCustomPropertySupport) {
            it('updates values via native setProperty() method', function(done) {
                const testElms = createTestElms([
                    '<p style="color: var(--color1);"></p>',
                    '<p style="color: var(--color2);"></p>',
                    '<p style="color: var(--color3);"></p>'
                ]);

                cssVars({
                    incremental: false,
                    variables  : {
                        color1    : 'green', // No leading --
                        '-color2' : 'blue',  // Malformed
                        '--color3': 'red'    // Leading --
                    }
                });

                expect(getComputedStyle(testElms[0]).color).to.be.colored('green');
                expect(getComputedStyle(testElms[1]).color).to.be.colored('blue');
                expect(getComputedStyle(testElms[2]).color).to.be.colored('red');
                done();
            });
        }

        if ('MutationObserver' in window) {
            describe('watch', function() {
                // Retry to try and address Safari + SauceLabs flakiness
                this.retries(3);
                this.timeout(5000);

                it('true - create MutationObserver', function(done) {
                    const styleCss = [
                        ':root{--color:red;}body{color:var(--color);}',
                        ':root{--color:green;}'
                    ];

                    createTestElms({ tag: 'style', text: styleCss[0] });

                    cssVars({
                        include    : '[data-test]',
                        incremental: false,
                        onlyLegacy : false,
                        watch      : true
                    });

                    setTimeout(function() {
                        expect(getComputedStyle(document.body).color).to.be.colored('red');
                        createTestElms({ tag: 'style', text: styleCss[1] });
                    }, 500);

                    setTimeout(function() {
                        expect(getComputedStyle(document.body).color, 'Observer On').to.be.colored('green');

                        // Disable MutationObserver
                        cssVars({
                            include    : '[data-test]',
                            incremental: false,
                            onlyLegacy : false,
                            watch      : false
                        });

                        done();
                    }, 1000);
                });

                it('false - disconnect MutationObserver', function(done) {
                    const styleCss  = [
                        ':root{--color:red;}body{color:var(--color);}',
                        ':root{--color:green;}',
                        ':root{--color:purple;}'
                    ];

                    createTestElms({ tag: 'style', text: styleCss[0] });

                    cssVars({
                        include    : '[data-test]',
                        incremental: false,
                        onlyLegacy : false,
                        watch      : true
                    });

                    setTimeout(function() {
                        expect(getComputedStyle(document.body).color).to.be.colored('red');

                        createTestElms({ tag: 'style', text: styleCss[1] });
                    }, 500);

                    setTimeout(function() {
                        expect(getComputedStyle(document.body).color, 'Observer On').to.be.colored('green');

                        cssVars({
                            include    : '[data-test]',
                            incremental: false,
                            onlyLegacy : false,
                            watch      : false
                        });

                        createTestElms({ tag: 'style', text: styleCss[2] });

                        setTimeout(function() {
                            expect(getComputedStyle(document.body).color, 'Observer Off').to.be.colored('green');
                            done();
                        }, 500);
                    }, 1000);
                });
            });
        }
    });

    // Tests: Callbacks
    // -------------------------------------------------------------------------
    describe('Callbacks', function() {
        it('triggers onBeforeSend callback on each request with proper arguments', function(done) {
            let onBeforeSendCount = 0;

            createTestElms([
                { tag: 'link', attr: { rel: 'stylesheet', href: '/base/tests/fixtures/test-value.css' } },
                { tag: 'style', text: '@import "/base/tests/fixtures/test-declaration.css";@import "/base/tests/fixtures/test-value.css";' }
            ]);

            cssVars({
                include    : '[data-test]',
                incremental: false,
                onlyLegacy : false,
                updateDOM  : false,
                onBeforeSend(xhr, node, url) {
                    xhr.setRequestHeader('css-vars-ponyfill', true);
                    onBeforeSendCount++;
                },
                onComplete(cssText, styleNode, cssVariables, benchmark) {
                    expect(onBeforeSendCount).to.equal(3);
                    done();
                }
            });
        });

        it('triggers onSuccess callback on each success with proper arguments', function(done) {
            const linkUrl   = '/base/tests/fixtures/test-value.css';
            const styleElms = createTestElms([
                { tag: 'style', text: ':root { --color: red; }' },
                { tag: 'style', text: 'p { color: var(--color); }' },
                { tag: 'link', attr: { rel: 'stylesheet', href: linkUrl } }
            ]);

            const expectCss = 'p{color:red;}'.repeat(2);

            let onSuccessCount = 0;

            cssVars({
                include    : '[data-test]',
                incremental: false,
                onlyLegacy : false,
                updateDOM  : false,
                onSuccess(cssText, node, url) {
                    expect(node, 'onSuccess node').to.equal(styleElms[onSuccessCount]);

                    // Link
                    if (node.tagName.toLowerCase() === 'link') {
                        expect(cssText.replace(/\n|\s/g, ''), 'onSuccess cssText').to.equal('p{color:var(--color);}');
                        expect(url, 'onSuccess url').to.include(linkUrl);
                    }
                    // Style
                    else {
                        expect(cssText, 'onSuccess cssText').to.equal(styleElms[onSuccessCount].textContent);
                        expect(url, 'onSuccess url').to.equal(window.location.href);
                    }

                    onSuccessCount++;

                    return /SKIP/.test(cssText) ? false : cssText;
                },
                onComplete(cssText, styleNode, cssVariables, benchmark) {
                    expect(onSuccessCount, 'onSuccess count').to.equal(styleElms.length);
                    expect(cssText).to.equal(expectCss);
                    done();
                }
            });
        });

        it('triggers onWarning callback on each warning with proper arguments', function(done) {
            const styleElms = createTestElms([
                { tag: 'style', text: 'p { color: var(--fail); }' }
            ]);

            let onWarningCount = 0;

            cssVars({
                include    : '[data-test]',
                incremental: false,
                onlyLegacy : false,
                silent     : true, // remove to display console error messages
                onWarning(warningMsg) {
                    onWarningCount++;
                },
                onComplete(cssText, styleNode, cssVariables, benchmark) {
                    expect(onWarningCount, 'onWarning count').to.equal(styleElms.length);
                    done();
                }
            });
        });

        it('triggers onError callback on each error with proper arguments', function(done) {
            const linkUrl   = '/base/tests/fixtures/test-onerror.css';
            const styleCss  = ':root { --error: red;';
            const styleElms = createTestElms([
                { tag: 'link', attr: { rel: 'stylesheet', href: 'fail.css' } },
                { tag: 'link', attr: { rel: 'stylesheet', href: linkUrl } },
                { tag: 'style', text: styleCss }
            ]);

            const onErrorMsgs  = [];
            const onErrorNodes = [];
            let   onErrorCount = 0;
            let   onErrorXHR;
            let   onErrorURL;

            cssVars({
                include    : '[data-test]',
                incremental: false,
                onlyLegacy : false,
                silent     : true, // remove to display console error messages
                onError(errorMsg, node, xhr, url) {
                    onErrorCount++;
                    onErrorMsgs.push(errorMsg);
                    onErrorNodes.push(node);

                    if (xhr) {
                        onErrorXHR = xhr;
                        onErrorURL = url;
                    }
                },
                onComplete(cssText, styleNode, cssVariables, benchmark) {
                    expect(onErrorCount, 'onError count').to.equal(styleElms.length);
                    expect(onErrorMsgs.filter(msg => msg.toLowerCase().indexOf('error') > -1), 'onError message').to.have.length(styleElms.length);
                    expect(onErrorNodes, 'onError nodes').to.include.members(styleElms);
                    expect(onErrorXHR.status, 'onError XHR').to.equal(404);
                    expect(onErrorURL, 'onError URL').to.include('fail.css');
                    done();
                }
            });
        });

        it('triggers onError callback on invalid <link> CSS', function(done) {
            const linkUrl  = '/base/tests/fixtures/404.html';
            const styleElm = createTestElms({ tag: 'link', attr: { rel: 'stylesheet', href: linkUrl } })[0];

            let onErrorCount = 0;

            cssVars({
                include    : '[data-test]',
                incremental: false,
                onlyLegacy : false,
                silent     : true, // remove to display console error messages
                onError(errorMsg, node, xhr, url) {
                    onErrorCount++;

                    expect(errorMsg.toLowerCase().indexOf('error') > -1, 'onError message').to.be.true;
                    expect(node, 'onError nodes').to.equal(styleElm);
                    expect(xhr.status, 'onError XHR').to.equal(200);
                    expect(url, 'onError URL').to.include(linkUrl);
                },
                onComplete(cssText, styleNode, cssVariables, benchmark) {
                    expect(onErrorCount, 'onError count').to.equal(1);
                    done();
                }
            });
        });

        it('triggers onComplete callback with proper arguments', function(done) {
            const styleCss   = ':root { --color: red; } p { color: var(--color); }';
            const expectCss  = 'p{color:red;}';

            createTestElms({ tag: 'style', text: styleCss });

            cssVars({
                include    : '[data-test]',
                incremental: false,
                onlyLegacy : false,
                updateDOM  : false,
                onComplete(cssText, styleNode, cssVariables, benchmark) {
                    expect(cssText).to.equal(expectCss);
                    expect(cssVariables).to.have.property('--color');
                    expect(cssVariables['--color']).to.equal('red');
                    done();
                }
            });
        });
    });

    // Tests: Updates
    // -------------------------------------------------------------------------
    describe('Updates', function() {
        it('handles incremental update', function(done) {
            const expectCss = 'p{color:red;}';

            createTestElms({ tag: 'style', text: ':root { --color: red; } p { color: var(--color); }' });

            cssVars({
                include    : '[data-test]',
                incremental: true,
                onlyLegacy : false,
                onComplete(cssText, styleNode, cssVariables, benchmark) {
                    expect(cssText, 'Pass1').to.equal(expectCss);

                    createTestElms({ tag: 'style', text: 'p { color: var(--color); }' });

                    cssVars({
                        include    : '[data-test]',
                        incremental: true,
                        onlyLegacy : false,
                        onComplete(cssText, styleNode, cssVariables, benchmark) {
                            const outNodes = document.querySelectorAll('style[data-cssvars="out"]');

                            Array.from(outNodes).forEach((node , i) => {
                                expect(cssText, `Pass2: outNode ${i}`).to.equal(expectCss);
                            });
                            done();
                        }
                    });
                }
            });
        });

        it('handles full updates (new variable declaration in CSS)', function(done) {
            const expectCss = [
                'p{color:red;}',
                'p{color:green;}'
            ];

            createTestElms({ tag: 'style', text: ':root { --color: red; } p { color: var(--color); }' });

            cssVars({
                include    : '[data-test]',
                incremental: false,
                onlyLegacy : false,
                onComplete(cssText, styleNode, cssVariables, benchmark) {
                    expect(cssText).to.equal(expectCss[0]);

                    createTestElms({ tag: 'style', text: ':root { --color: green; }' });

                    cssVars({
                        include    : '[data-test]',
                        incremental: false,
                        onlyLegacy : false,
                        onComplete(cssText, styleNode, cssVariables, benchmark) {
                            expect(cssText).to.equal(expectCss[1]);
                            done();
                        }
                    });
                }
            });
        });

        it('handles full updates (new variable declaration in settings.variables)', function(done) {
            const expectCss = [
                'p{color:red;}',
                'p{color:green;}'
            ];

            createTestElms({ tag: 'style', text: ':root { --color: red; } p { color: var(--color); }' });

            cssVars({
                include    : '[data-test]',
                incremental: false,
                onlyLegacy : false,
                onComplete(cssText, styleNode, cssVariables, benchmark) {
                    expect(cssText).to.equal(expectCss[0]);

                    cssVars({
                        include    : '[data-test]',
                        incremental: false,
                        onlyLegacy : false,
                        variables  : { color: 'green' },
                        onComplete(cssText, styleNode, cssVariables, benchmark) {
                            expect(cssText).to.equal(expectCss[1]);
                            done();
                        }
                    });
                }
            });

        });

        it('updates inserted <style> location when called multiple times', function(done) {
            const styleElms1 = createTestElms([
                { tag: 'style', text: '/* 1 */' },
                // Not processed by cssVars (used to test insert location)
                { tag : 'style', text: '/* 2 */', attr: { 'data-skip': true }}
            ]);

            cssVars({
                include    : '[data-test]:not([data-skip])',
                incremental: false,
                onlyLegacy : false,
                onComplete(cssText, styleNode, cssVariables, benchmark) {
                    const styleElms = Array.from(document.querySelectorAll('style'));
                    const isAfterLastProcessedElm = styleElms1[0].nextSibling === styleNode;
                    const isBeforeSkipElm = styleElms.indexOf(styleNode) < styleElms.indexOf(styleElms1[1]);

                    expect(styleNode.parentNode.tagName, 'inserted into <head>').to.equal('HEAD');
                    expect(isAfterLastProcessedElm, 'inserted after last element processed').to.be.true;
                    expect(isBeforeSkipElm, 'inserted before skipped element').to.be.true;

                    const styleElms2 = createTestElms([
                        { tag: 'style', text: '/* 3 */' },
                        // Not processed by cssVars (used to test insert location)
                        { tag : 'style', text: '/* 4 */', attr: { 'data-skip': true }}
                    ], { appendTo: 'body' });

                    cssVars({
                        include    : '[data-test]:not([data-skip])',
                        incremental: false,
                        onlyLegacy : false,
                        onComplete(cssText, styleNode, cssVariables, benchmark) {
                            const styleElms = Array.from(document.querySelectorAll('style'));
                            const isAfterLastProcessedElm = styleElms2[0].nextSibling === styleNode;
                            const isBeforeSkipElm = styleElms.indexOf(styleNode) < styleElms.indexOf(styleElms2[1]);

                            expect(styleNode.parentNode.tagName, 'inserted into <body>').to.equal('BODY');
                            expect(isAfterLastProcessedElm, 'inserted after last element processed').to.be.true;
                            expect(isBeforeSkipElm, 'inserted before skipped element').to.be.true;

                            done();
                        }
                    });
                }
            });
        });

        it('persists options.variables when called multiple times', function(done) {
            const expectCss = [
                'h1{color:red;}',
                'h1{color:red;}h2{color:red;}',
                'h1{color:blue;}h2{color:blue;}'
            ];

            function pass1() {
                cssVars({
                    include    : '[data-test]',
                    incremental: false,
                    onlyLegacy : false,
                    variables  : { color: 'red' },
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        expect(cssText, 'set value').to.equal(expectCss[0]);
                        createTestElms({ tag: 'style', text: 'h2 { color: var(--color); }' });
                        pass2();
                    }
                });
            }

            function pass2() {
                cssVars({
                    include    : '[data-test]',
                    incremental: false,
                    onlyLegacy : false,
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        expect(cssText, 'persist').to.equal(expectCss[1]);
                        pass3();
                    }
                });
            }

            function pass3() {
                cssVars({
                    include    : '[data-test]',
                    incremental: false,
                    onlyLegacy : false,
                    updateDOM  : false,
                    variables  : { color: 'blue' },
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        expect(cssText, 'set non-persist value').to.equal(expectCss[2]);
                        pass4();
                    }
                });
            }

            function pass4() {
                cssVars({
                    include    : '[data-test]',
                    incremental: false,
                    onlyLegacy : false,
                    onComplete(cssText, styleNode, cssVariables, benchmark) {
                        expect(cssText, 'does not persist').to.equal(expectCss[1]);
                        done();
                    }
                });
            }

            createTestElms({ tag: 'style', text: 'h1 { color: var(--color); }' });
            pass1();
        });

        // @keyframe support required
        if (hasAnimationSupport) {
            it('Fixes @keyframe bug in legacy (IE) and modern (Safari) browsers', function(done) {
                // Retry to try and address Safari + SauceLabs flakiness
                this.retries(3);

                const testElm = createTestElms({
                    tag: 'p', text: 'Test Element', appendTo: 'body', attr: { class: 'test' }
                })[0];

                function getCurrentColor() {
                    return getComputedStyle(testElm).color;
                }

                createTestElms({ tag: 'style', text: `
                    :root {
                        --color: red;
                    }
                    p.test {
                        -webkit-animation: test 1ms forwards;
                                animation: test 1ms forwards;
                    }
                    @-webkit-keyframes test {
                        from, to {
                            color: var(--color);
                        }
                    }
                    @keyframes test {
                        from, to {
                            color: var(--color);
                        }
                    }
                ` });

                cssVars({
                    include    : 'style[data-test]',
                    incremental: false,
                    onlyLegacy : false
                });

                setTimeout(function() {
                    expect(getCurrentColor(), 'Initial @keyframes').to.be.colored('red');

                    cssVars({
                        include    : 'style[data-test]',
                        incremental: false,
                        onlyLegacy : false,
                        variables  : {
                            color: 'blue'
                        }
                    });

                    setTimeout(function() {
                        expect(getCurrentColor(), 'Updated @keyframes').to.be.colored('blue');

                        done();
                    }, 500);
                }, 500);
            });
        }
    });

    // Tests: Performance
    // -------------------------------------------------------------------------
    // describe.only('Performance', function() {
    //     it('Handles large block of CSS using onlyVars option', function(done) {
    //         const testCount = 20000;
    //         const styleCss  = `
    //             :root { --color: red; }
    //             ${'div { color: red; }'.repeat(testCount)}
    //         `;

    //         createTestElms({ tag: 'style', text: styleCss });

    //         cssVars({
    //             include    : '[data-test]',
    //             incremental: false,
    //             onlyLegacy : false,
    //             onlyVars   : true,
    //             onComplete(cssText, styleNode, cssVariables, benchmark) {
    //                 console.log('Processed:', cssText.length + ' characters');
    //                 console.log('Benchmark:', `${(benchmark / 1000).toFixed(2)} seconds`);
    //                 expect(1).to.equal(1);
    //                 done();
    //             }
    //         });
    //     });
    // });
});
