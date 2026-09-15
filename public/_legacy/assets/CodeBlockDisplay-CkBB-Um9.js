import{d6 as W,u as B,d as V,l as X,r as d,aT as Y,j as e,X as _,C as J,fv as I,bq as R,aU as K}from"./index-CugVVnIU.js";import{g as k}from"./componentCenteringUtils-D5WdjxUy.js";import{M as Q}from"./minus-zQmAGM6r.js";import{M as Z}from"./maximize-2-B2Ok4kLF.js";import{L as A}from"./lock-CVmPgxr4.js";import{P as ee}from"./pause-iE2SIXg0.js";import{P as te}from"./play-8vvYZuWy.js";import{C as re}from"./copy-DjHHtTZ8.js";import{h as oe}from"./prism-DFEyy-vG.js";import{v as ie}from"./vsc-dark-plus-CcVsXCy1.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ne=W("SquareArrowUpRight",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M8 8h8v8",key:"b65dnt"}],["path",{d:"m8 16 8-8",key:"13b9ih"}]]),se=t=>{var h;if(!t)return"";const p='<script src="https://tailwind-dummy.local"><\/script>',m=`
    <style>
      /* Disable animations */
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
        animation: none !important;
      }
      
      /* Disable CSS transforms that might be animated */
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
      
      /* Override opacity-0 class during preview to keep elements visible */
      .opacity-0 {
        opacity: 1 !important;
      }
      
      /* Disable classes with "animate" in their name */
      [class*="animate"] {
        animation: none !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        animation-iteration-count: 1 !important;
        animation-fill-mode: none !important;
        opacity: 1 !important;
        filter: none !important;
        -webkit-filter: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      
      /* Hide Spline embeds */
      spline-viewer,
      [data-spline],
      iframe[src*="spline.design"],
      iframe[src*="my.spline.design"],
      embed[src*="spline.design"],
      embed[src*="my.spline.design"],
      object[data*="spline.design"],
      object[data*="my.spline.design"] {
        display: none !important;
        visibility: hidden !important;
      }
      
      /* Hide canvas elements that might be used for threejs */
      canvas:not([data-allow-canvas]) {
        display: none !important;
        visibility: hidden !important;
      }
    </style>
    <script>
      (function() {
        // Disable requestAnimationFrame
        window.requestAnimationFrame = function(callback) {
          return -1;
        };
        
        // Disable setTimeout for short intervals (likely animations)
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, delay) {
          if (delay < 100) {
            // Return a valid timer ID but don't execute the callback
            return originalSetTimeout.call(this, function() {}, delay);
          }
          return originalSetTimeout.apply(this, arguments);
        };
        
        // Disable setInterval (likely animations)
        const originalSetInterval = window.setInterval;
        window.setInterval = function(callback, delay) {
          // Return a valid timer ID but don't execute the callback
          return originalSetInterval.call(this, function() {}, delay);
        };
        
        // Disable canvas rendering
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
          // Allow canvas if explicitly marked as allowed
          if (this.hasAttribute('data-allow-canvas')) {
            return originalGetContext.call(this, contextType, contextAttributes);
          }
          
          const context = originalGetContext.call(this, contextType, contextAttributes);
          if (!context) return context;
          
          // For 2D context, override drawing methods
          if (contextType === '2d') {
            const drawingMethods = [
              'clearRect', 'fillRect', 'strokeRect', 'fillText', 'strokeText',
              'drawImage', 'putImageData', 'fill', 'stroke', 'arc', 'arcTo',
              'beginPath', 'closePath', 'lineTo', 'moveTo', 'quadraticCurveTo',
              'bezierCurveTo', 'rect', 'ellipse'
            ];
            
            drawingMethods.forEach(method => {
              if (typeof context[method] === 'function') {
                context[method] = function() {
                  return this;
                };
              }
            });
          }
          
          // For WebGL context, override key methods
          else if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
            const webglMethods = [
              'clear', 'drawArrays', 'drawElements', 'useProgram', 'bindBuffer',
              'bindTexture', 'bindFramebuffer', 'viewport', 'enable', 'disable'
            ];
            
            webglMethods.forEach(method => {
              if (typeof context[method] === 'function') {
                context[method] = function() {
                  return this;
                };
              }
            });
          }
          
          return context;
        };
        
        // Disable Three.js specific functionality
        setTimeout(() => {
          if (typeof THREE !== 'undefined') {
            if (THREE.WebGLRenderer) {
              THREE.WebGLRenderer.prototype.render = function() {
                return this;
              };
            }
            
            if (THREE.AnimationMixer) {
              THREE.AnimationMixer.prototype.update = function() {
                return this;
              };
            }
          }
        }, 100);
        
        // Disable Spline functionality
        const hideSplineElements = () => {
          const splineSelectors = [
            'spline-viewer',
            '[data-spline]',
            'iframe[src*="spline.design"]',
            'iframe[src*="my.spline.design"]',
            'embed[src*="spline.design"]',
            'embed[src*="my.spline.design"]',
            'object[data*="spline.design"]',
            'object[data*="my.spline.design"]'
          ];
          
          splineSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
            });
          });
        };
        
        hideSplineElements();
        
        // Monitor for new spline elements being added
        if (document.body instanceof Node) {
          const observer = new MutationObserver(hideSplineElements);
          observer.observe(document.body, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'data']
          });
        }
        
        // Disable Spline runtime
        if (typeof window.Spline !== 'undefined') {
          window.Spline = function() {
            return {
              load: () => Promise.resolve(),
              setSize: () => {},
              dispose: () => {},
              play: () => {},
              pause: () => {},
              stop: () => {}
            };
          };
        }
        
        Object.defineProperty(window, 'Spline', {
          set: function(value) {
            window._SplineOriginal = value;
          },
          get: function() {
            return function() {
              return {
                load: () => Promise.resolve(),
                setSize: () => {},
                dispose: () => {},
                play: () => {},
                pause: () => {},
                stop: () => {}
              };
            };
          },
          configurable: true
        });
      })();
    <\/script>
  `;if(t.toLowerCase().includes("<html")&&t.toLowerCase().includes("<head")&&t.toLowerCase().includes("<body")){let r=t;const s=[];t.includes("fonts.googleapis.com")||(s.push('<link rel="preconnect" href="fonts-dummy.local">'),s.push('<link rel="preconnect" href="fonts-gstatic-dummy.local" crossorigin>'),s.push('<link href="fonts-dummy.local/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">')),t.includes("https://tailwind-dummy.local")||s.push(p),t.includes("lucide")||s.push('<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"><\/script>'),(!t.includes("font-family")||!t.includes("Inter"))&&s.push(`<style>
      body { font-family: 'Inter', sans-serif; }
    </style>`);const x=[...s,m];if(x.length>0){const a=x.join(`
  `);r.toLowerCase().includes("</head>")?r=r.replace(/(<\/head>)/i,`  ${a}
$1`):r.toLowerCase().includes("<head>")&&(r=r.replace(/(<head[^>]*>)/i,`$1
  ${a}`))}if(r.toLowerCase().includes("<body")){const a=r.match(/<body[^>]*>([\s\S]*)<\/body>/i);if(a){const y=a[1],w=((h=a[0].match(/<body[^>]*>/i))==null?void 0:h[0])||"<body>";r.toLowerCase().includes("</head>")&&(r=r.replace(/(<\/head>)/i,`
    <style>
      html, body {
        height: 100%;
        margin: 0;
        padding: 0;
      }
      .component-wrapper {
        width: 100%;
        height: 100%;
        padding: 0;
        box-sizing: border-box;
        overflow: auto;
      }
    </style>
$1`)),r=r.replace(/<body[^>]*>([\s\S]*)<\/body>/i,`${w}
    <div class="component-wrapper">
      ${y}
    </div>
    ${k()}
  </body>`)}}return r}return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${`
  <link rel="preconnect" href="fonts-dummy.local">
  <link rel="preconnect" href="fonts-gstatic-dummy.local" crossorigin>
  <link href="fonts-dummy.local/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  ${p}
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"><\/script>
  <style>
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
    }
    body { font-family: 'Inter', sans-serif; }
    .component-wrapper {
      width: 100%;
      height: 100%;
      padding: 0;
      box-sizing: border-box;
      overflow: auto;
    }
  </style>`}
  ${m}
  <title>Preview</title>
</head>
<body>
  <div class="component-wrapper">
  ${t}
  </div>
  ${k()}
</body>
</html>`},ye=({rawHtmlContent:t,onPromoteToMainPreview:p,height:m="240px",startHidden:f=!1,defaultEffectsEnabled:h=!1,zoom:r=.5,backgroundColor:s="white",centerContent:x=!1,defaultView:a="preview",premium:y=!1,sourceLocked:w=!1})=>{const{userTier:j}=B(),{toast:C}=V(),T=X(),S=d.useRef(null),E=Y(S,{root:null,rootMargin:"200px 0px 200px 0px",threshold:.01}),[c,b]=d.useState(a),[N,g]=d.useState(f),[F,$]=d.useState(!1),[u,H]=d.useState(h);d.useEffect(()=>{b(a)},[a]),d.useEffect(()=>{g(f)},[f]);const U=K.isProUser(j),o=y&&!U,n=o||w;d.useEffect(()=>{n&&c==="code"&&b("preview")},[c,n]);const G=()=>{if(n){I(C,T,"copy");return}navigator.clipboard.writeText(t),$(!0),setTimeout(()=>$(!1),2e3)},P=()=>{if(o){I(C,T,"view");return}p&&p(R(t))},q=()=>{H(!u)},O=!N&&c==="preview"&&E&&!o?(()=>{var L;if(c!=="preview")return"";try{let i=t.length>5e5?t:u?R(t):se(t);if(i.toLowerCase().includes("<body")){const v=i.match(/<body[^>]*>([\s\S]*)<\/body>/i);if(v){let l=v[1];const z=((L=v[0].match(/<body[^>]*>/i))==null?void 0:L[0])||"<body>",M=`
      <style>
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        .component-wrapper {
          width: 100%;
          height: 100%;
          padding: 0;
          box-sizing: border-box;
          overflow: auto;
        }
      </style>`;i.includes(".component-wrapper")||(i.toLowerCase().includes("</head>")?i=i.replace(/(<\/head>)/i,`${M}
$1`):i.toLowerCase().includes("<head>")&&(i=i.replace(/(<head[^>]*>)/i,`$1
${M}`))),!l.includes('class="component-wrapper"')&&!l.includes("class='component-wrapper'")&&(l=`<div class="component-wrapper">${l}</div>`),!l.includes("getComponentCenteringScript")&&!l.includes("checkAndCenter")&&(l=`${l}
    ${k()}`),i=i.replace(/<body[^>]*>([\s\S]*)<\/body>/i,`${z}
      ${l}
    </body>`)}}return i}catch(D){return console.warn("Failed to prepare HTML for preview, using raw content:",D),t}})():"";return e.jsxs("div",{ref:S,className:"my-2 rounded-md overflow-hidden border border-black/5 dark:border-white/10 bg-neutral-100 dark:bg-neutral-900",children:[e.jsxs("div",{className:"flex items-center justify-between p-1 px-1 bg-neutral-50 dark:bg-neutral-800/80 border-b border-border/50 text-xs",children:[e.jsxs("div",{className:"flex items-center space-x-1.5 pl-1.5",children:[e.jsx("span",{className:"block w-2.5 h-2.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-red-400 rounded-full transition-colors relative group cursor-pointer",onClick:()=>g(!0),children:e.jsx(_,{className:"absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 opacity-0 group-hover:opacity-100 text-white",strokeWidth:3})}),e.jsx("span",{className:"block w-2.5 h-2.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-yellow-400 rounded-full transition-colors relative group cursor-pointer",onClick:()=>g(!0),children:e.jsx(Q,{className:"absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 opacity-0 group-hover:opacity-100 text-white",strokeWidth:3})}),e.jsx("span",{className:`block w-2.5 h-2.5 bg-neutral-300 dark:bg-neutral-700 rounded-full transition-colors relative group ${o?"cursor-not-allowed opacity-50":"hover:bg-green-400 cursor-pointer"}`,onClick:P,children:e.jsx(Z,{className:"absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 opacity-0 group-hover:opacity-100 text-white",strokeWidth:3})}),e.jsxs("div",{className:"flex items-center space-x-1",children:[p&&e.jsx(e.Fragment,{children:e.jsxs("button",{onClick:P,title:o?"Pro content - Upgrade to view":"Show in main preview",disabled:o,className:`flex gap-1 items-center ml-1 p-0 px-1 rounded border text-[10px] font-medium ${o?"cursor-not-allowed opacity-50 border-neutral-200 dark:border-neutral-700 text-neutral-400":"hover:bg-neutral-100 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-500"}`,children:[o?e.jsx(A,{className:"h-2.5 w-2.5 text-muted-foreground opacity-50"}):e.jsx(ne,{className:"h-2.5 w-2.5 text-muted-foreground opacity-50"}),o?"Locked":"View"]})}),e.jsx("button",{onClick:q,disabled:o,title:o?"Pro content - Upgrade to toggle effects":u?"Disable animations & effects":"Enable animations & effects",className:`flex gap-1 items-center p-0 px-1 rounded border text-[10px] font-medium transition-colors h-[18px] ${o?"cursor-not-allowed opacity-50 border-neutral-200 dark:border-neutral-700 text-neutral-400":u?"text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30":"text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"}`,children:u?e.jsx(ee,{className:"h-2.5 w-2.5 opacity-50"}):e.jsx(te,{className:"h-2.5 w-2.5 opacity-50"})})]})]}),e.jsxs("div",{className:"flex items-center space-x-1",children:[e.jsxs("button",{onClick:G,disabled:n,className:`flex gap-1 items-center ml-1 p-0 px-1 rounded border text-[10px] font-medium ${n?"cursor-not-allowed opacity-50 border-neutral-200 dark:border-neutral-700 text-neutral-400":"hover:bg-neutral-100 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-500"}`,title:n?"Pro content - Upgrade to copy":"Copy code to clipboard",children:[n?e.jsx(A,{className:"h-2.5 w-2.5 text-muted-foreground opacity-50"}):F?e.jsx(J,{className:"h-2.5 w-2.5 text-muted-foreground opacity-50"}):e.jsx(re,{className:"h-2.5 w-2.5 text-muted-foreground opacity-50"}),n?"Locked":"Copy"]}),e.jsxs("div",{className:"flex items-center bg-neutral-200/70 dark:bg-neutral-700/70 rounded-md p-[0.5px] border border-border/60",children:[e.jsx("button",{onClick:()=>{o||b("preview")},disabled:o,className:`px-2 py-0 text-[9px] font-medium rounded-[4px] transition-all ${o?"cursor-not-allowed opacity-50":c==="preview"?"bg-white dark:bg-neutral-600 text-primary shadow-sm":"text-muted-foreground hover:text-foreground"}`,children:"Preview"}),e.jsx("button",{onClick:()=>{n||b("code")},disabled:n,className:`px-2 py-0 text-[9px] font-medium rounded-[4px] transition-all ${n?"cursor-not-allowed opacity-50":c==="code"?"bg-white dark:bg-neutral-600 text-primary shadow-sm":"text-muted-foreground hover:text-foreground"}`,children:"Code"})]})]})]}),N?e.jsx("div",{className:"h-[30px] flex items-center justify-center",children:e.jsx("button",{onClick:()=>g(!1),className:"text-[10px] text-muted-foreground hover:text-foreground",children:"Click to show content"})}):e.jsx("div",{className:"overflow-auto",style:{height:m},children:E?c==="code"?e.jsx(oe,{language:"html",style:ie,customStyle:{margin:0,fontSize:"11px",fontFamily:"Geist Mono, monospace",backgroundColor:"var(--syntax-bg)",color:"var(--syntax-color)",padding:"10px",lineHeight:"1.4"},codeTagProps:{style:{fontFamily:"Geist Mono, monospace"}},className:"w-full",children:t}):e.jsx("div",{className:"w-full h-full overflow-hidden",style:{backgroundColor:s},children:e.jsx("iframe",{srcDoc:O,title:"Embedded HTML Preview",style:{width:`${100/r}%`,height:`${100/r}%`,transform:`scale(${r})`,transformOrigin:"top left",border:"none",backgroundColor:s},sandbox:"allow-scripts allow-forms allow-popups allow-modals"})}):e.jsx("div",{className:"w-full h-full flex items-center justify-center text-[10px] text-muted-foreground bg-neutral-50 dark:bg-neutral-900/60",children:"Code preview paused (off-screen)"})})]})};export{ye as C,ne as S};
