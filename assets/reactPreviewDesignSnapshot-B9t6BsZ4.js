const y=new Set(["preconnect","preload","stylesheet"]),l="https://cdn.tailwindcss.com",h="https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js",f=[/cdn\.tailwindcss\.com/i,/code\.iconify\.design\/(?:iconify-icon|3\/)/i,/unpkg\.com\/lucide@/i],E=/Background \((embed|video|image|component)\) added by Aura/i,b=`html,
body {
  min-height: 100%;
}

body {
  margin: 0;
}

#root {
  min-height: 100%;
}`,p=e=>e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),d=e=>Array.from(e.attributes).map(t=>`${t.name}="${p(t.value)}"`).join(" "),c=e=>{const t=e.cloneNode(!0);return t.querySelectorAll("script, noscript").forEach(n=>n.remove()),t},u=e=>e.nodeType===Node.COMMENT_NODE&&E.test(e.data||""),m=e=>{var i;const t=e,n=t.classList,r=(((i=t.style)==null?void 0:i.backgroundImage)||"").includes("url(")&&n.contains("top-0")&&n.contains("w-full")&&(n.contains("fixed")||n.contains("absolute"));return t.id==="aura-image"||t.id==="aura-spline"||t.id==="aura-video"||n.contains("spline-container")||n.contains("video-background-container")||n.contains("aura-background-component")||e.matches("iframe[src*='spline.design'], video, [data-us-project]")?!0:r},N=e=>f.some(t=>t.test(e)),A=e=>{const t=e.tagName.toLowerCase();if(t==="meta"||t==="style"||t==="title")return!0;if(t!=="link"){if(t!=="script")return!1;const o=e.getAttribute("src")||"";return!!o&&N(o)}return(e.getAttribute("rel")||"").toLowerCase().split(/\s+/).filter(Boolean).some(o=>y.has(o))},T=(e,t,n)=>{const o=Array.from(e.head.children).filter(A).filter(r=>r.tagName.toLowerCase()!=="title").map(r=>c(r).outerHTML).filter(Boolean);return o.unshift(`<title>${p(t)}</title>`),o.some(r=>r.includes(l))||o.unshift(`<script src="${l}"><\/script>`),/<iconify-icon[\s>]/i.test(n)&&!o.some(r=>r.includes("code.iconify.design"))&&o.unshift(`<script src="${h}"><\/script>`),o.push(`<style data-aura-react-design-snapshot="true">${b}</style>`),o.join(`
`)},k=e=>{const t=e.getElementById("root"),n=Array.from(e.body.childNodes),o=n.some(i=>i===t?!1:u(i)?!0:i.nodeType===Node.ELEMENT_NODE&&m(i));if(t&&!o)return c(t).outerHTML;if(t&&o){const i=n.map(s=>s===t?c(t).outerHTML:u(s)?`<!--${s.data}-->`:s.nodeType===Node.ELEMENT_NODE&&m(s)?c(s).outerHTML:"").filter(Boolean);if(i.length>0)return i.join(`
`)}return c(e.body).innerHTML},_=(e,t={})=>{var a;const n=(e==null?void 0:e.contentDocument)||((a=e==null?void 0:e.contentWindow)==null?void 0:a.document)||null;if(!(n!=null&&n.documentElement)||!n.body)throw new Error("Preview is not ready for design mode yet.");const o=k(n).trim();if(!o)throw new Error("Preview content is empty.");const r=d(n.documentElement),i=d(n.body),s=t.pageLabel||t.pagePath||n.title||t.projectName||"React Project",g=T(n,s,o);return`<!DOCTYPE html>
<html${r?` ${r}`:""}>
<head>
${g}
</head>
<body${i?` ${i}`:""}>
${o}
</body>
</html>`};export{_ as c};
