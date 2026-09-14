import{s as u,ap as he}from"./index-CugVVnIU.js";import{r as ge,P as xe}from"./sharedCodeCapture-CpI6UDRA.js";import"./html2canvas.esm-CBrSDip1.js";import"./gradientTextFix-DrCMmlC8.js";import"./circle-x-D6iz-hl_.js";const we=`---
version: "alpha"
name: "AeroNet Visualization"
description: "Aeronet Visualization Dashboard Section is designed for demonstrating application workflows and interface hierarchy. Key features include clear information density, modular panels, and interface rhythm. It is suitable for product showcases, admin panels, and analytics experiences."
colors:
  primary: "#9CA3AF"
  secondary: "#6B7280"
  tertiary: "#A69DB9"
  neutral: "#FFFFFF"
  background: "#FFFFFF"
  surface: "#000000"
  text-primary: "#E5E7EB"
  text-secondary: "#9CA3AF"
  border: "#FFFFFF"
  accent: "#9CA3AF"
typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: "60px"
    fontWeight: 400
    lineHeight: "60px"
    letterSpacing: "-0.025em"
  body-md:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: 300
    lineHeight: "16px"
  label-md:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
rounded:
  md: "0px"
  full: "9999px"
spacing:
  base: "6px"
  sm: "2px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  gap: "6px"
  card-padding: "8px"
  section-padding: "24px"
components:
  button-primary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "8px"
  button-link:
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "0px"
---

## Overview

- **Composition cues:**
  - Layout: Flex
  - Content Width: Full Bleed
  - Framing: Glassy
  - Grid: Minimal

## Colors

The color system uses dark mode with #9CA3AF as the main accent and #FFFFFF as the neutral foundation.

- **Primary (#9CA3AF):** Main accent and emphasis color.
- **Secondary (#6B7280):** Supporting accent for secondary emphasis.
- **Tertiary (#A69DB9):** Reserved accent for supporting contrast moments.
- **Neutral (#FFFFFF):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #FFFFFF; Surface: #000000; Text Primary: #E5E7EB; Text Secondary: #9CA3AF; Border: #FFFFFF; Accent: #9CA3AF

## Typography

Typography relies on Inter across display, body, and utility text.

- **Display (\`display-lg\`):** Inter, 60px, weight 400, line-height 60px, letter-spacing -0.025em.
- **Body (\`body-md\`):** Inter, 12px, weight 300, line-height 16px.
- **Labels (\`label-md\`):** Inter, 14px, weight 400, line-height 20px.

## Layout

Layout follows a flex composition with reusable spacing tokens. Preserve the flex, full bleed structural frame before changing ornament or component styling. Use 6px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a flex / full bleed composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Flex
- **Content width:** Full Bleed
- **Base unit:** 6px
- **Scale:** 2px, 6px, 8px, 12px, 16px, 24px, 32px
- **Section padding:** 24px
- **Card padding:** 8px, 12px, 14px
- **Gaps:** 6px, 8px, 12px, 20px

## Elevation & Depth

Depth is communicated through glass, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as glass first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Glass
- **Borders:** 1px #FFFFFF; 1px #3F3F46; 1px #52525B
- **Shadows:** rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.25) 0px 25px 50px -12px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 2px 4px 0px inset; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(255, 255, 255, 0.2) 0px 0px 15px 0px
- **Blur:** 12px

## Shapes

Shapes rely on a tight radius system anchored by 16px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 16px, 9999px
- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Anchor interactions to the detected button styles.

### Buttons
- **Primary:** background #FFFFFF, text #000000, radius 9999px, padding 8px, border 0px solid rgb(229, 231, 235).
- **Links:** text #9CA3AF, radius 0px, padding 0px, border 0px solid rgb(229, 231, 235).

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 6px rhythm.
- Do reuse the Glass surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 16px, 9999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 2000ms and 150ms. Easing favors ease and 0. Hover behavior focuses on text and color changes.

**Motion Level:** moderate

**Durations:** 2000ms, 150ms

**Easings:** ease, 0, 0.2, 1), cubic-bezier(0, cubic-bezier(0.4

**Hover Patterns:** text, color
`,be=`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AeroNet Visualization</title>
    <script src="https://tailwind-dummy.local"><\/script>
    <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"><\/script>
    <link href="fonts-dummy.local/css2?family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
</head>
<body class="text-gray-100 antialiased selection:bg-zinc-800 selection:text-white" style="font-family: 'Inter', sans-serif; background: radial-gradient(circle at bottom right, #18181b 0%, #000000 50%, #000000 100%); overflow: hidden; margin: 0; padding: 0; height: 100vh; width: 100vw;">

    <canvas id="animationCanvas" class="absolute inset-0 w-full h-full z-0 pointer-events-none"></canvas>

    <header class="absolute top-0 left-0 w-full px-8 py-6 z-50 flex justify-between items-center pointer-events-auto">
        <div class="flex items-center gap-2">
            <iconify-icon icon="solar:globus-linear" class="text-2xl text-white"></iconify-icon>
            <span class="text-base tracking-tight font-normal text-white">AeroNet</span>
        </div>
        <nav class="hidden md:flex items-center gap-8">
            <a href="#" class="text-sm font-light text-gray-400 hover:text-white transition-colors">Mapping</a>
            <a href="#" class="text-sm font-light text-gray-400 hover:text-white transition-colors">Framework</a>
            <a href="#" class="text-sm font-light text-gray-400 hover:text-white transition-colors">Metrics</a>
            <a href="#" class="text-sm font-light text-gray-400 hover:text-white transition-colors">Docs</a>
        </nav>
        <div class="flex items-center gap-5">
            <a href="#" class="text-sm font-light text-gray-300 hover:text-white transition-colors hidden sm:block">Log In</a>
            <button class="bg-white text-black text-sm font-normal px-4 py-2 rounded-full hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                Deploy Node
            </button>
        </div>
    </header>

    <main class="relative z-10 w-full h-full">
        
        <div class="absolute top-[35%] left-8 md:left-16 max-w-sm z-20 pointer-events-none">
            <h1 class="text-5xl md:text-6xl tracking-tight font-normal text-white leading-tight mb-4">
                Planet<br>Core
            </h1>
            <p class="text-base md:text-lg text-gray-400 font-light max-w-[280px]">
                Uninterrupted worldwide relay networks driving next-generation infrastructure.
            </p>
        </div>

        <div class="absolute inset-0 pointer-events-none hidden md:block">
            
            <div class="absolute top-[48%] left-[23%] pointer-events-auto" data-float data-float-offset="0">
                <div class="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-full px-4 py-1.5 flex items-center justify-center">
                    <span class="text-xs font-normal text-gray-200">19.5 TB/s</span>
                </div>
                <div class="absolute -right-3 top-1/2 -mt-1 w-2 h-2 bg-white rounded-full">
                    <div class="absolute inset-0 rounded-full animate-ping bg-white opacity-75" style="animation-duration: 2s;"></div>
                </div>
            </div>

            <div class="absolute top-[30%] left-[36%] pointer-events-auto" data-float data-float-offset="3">
                <div class="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-full px-4 py-1.5 flex items-center gap-1.5 justify-center">
                    <iconify-icon icon="solar:users-group-rounded-linear" class="text-gray-300 text-sm"></iconify-icon>
                    <span class="text-xs font-normal text-gray-200">+924</span>
                </div>
                <div class="absolute -bottom-3 left-1/2 -ml-1 w-2 h-2 bg-white rounded-full">
                    <div class="absolute inset-0 rounded-full animate-ping bg-white opacity-75" style="animation-duration: 2s; animation-delay: 0.5s;"></div>
                </div>
            </div>

            <div class="absolute top-[16%] left-[47%] pointer-events-auto" data-float data-float-offset="0">
                <div class="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-full px-4 py-1.5 flex items-center justify-center">
                    <span class="text-xs font-normal text-gray-200">820 GB/s</span>
                </div>
            </div>

            <div class="absolute top-[12%] left-[75%] pointer-events-auto" data-float data-float-offset="3">
                <div class="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-full px-4 py-1.5 flex items-center gap-1.5 justify-center">
                    <iconify-icon icon="solar:user-plus-rounded-linear" class="text-gray-300 text-sm"></iconify-icon>
                    <span class="text-xs font-normal text-gray-200">+418</span>
                </div>
            </div>

            <div class="absolute top-[48%] left-[36%] pointer-events-auto" data-float data-float-offset="0">
                <div class="absolute -top-12 -right-8 bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl px-4 py-2 w-max">
                    <span class="text-xs font-light text-gray-300">Relay established<br>successfully.</span>
                    <div class="absolute -bottom-2 left-4 w-4 h-4 bg-zinc-900/80 border-b border-r border-white/10 transform rotate-45 backdrop-blur-md"></div>
                </div>
                <div class="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-full p-1.5 relative z-10">
                    <img src="https://i.pravatar.cc/150?img=47" alt="User" class="w-10 h-10 rounded-full object-cover grayscale opacity-80">
                </div>
                <div class="absolute -bottom-4 left-1/2 -ml-1 w-2 h-2 bg-white rounded-full">
                    <div class="absolute inset-0 rounded-full animate-ping bg-white opacity-75" style="animation-duration: 2s; animation-delay: 1s;"></div>
                </div>
            </div>

            <div class="absolute top-[65%] left-[45%] pointer-events-auto" data-float data-float-offset="3">
                <div class="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl p-3 shadow-lg">
                    <iconify-icon icon="solar:user-circle-linear" class="text-gray-400 text-3xl"></iconify-icon>
                </div>
                <div class="absolute -bottom-4 left-1/2 -ml-1 w-2 h-2 bg-white rounded-full">
                    <div class="absolute inset-0 rounded-full animate-ping bg-white opacity-75" style="animation-duration: 2s; animation-delay: 0.2s;"></div>
                </div>
            </div>

            <div class="absolute top-[48%] left-[65%] pointer-events-auto" data-float data-float-offset="0">
                <div class="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-full px-4 py-1.5 flex items-center justify-center">
                    <span class="text-xs font-normal text-gray-200">2.41 PB/s</span>
                </div>
            </div>

            <div class="absolute top-[76%] left-[24%] pointer-events-auto" data-float data-float-offset="3">
                <div class="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div class="rounded-full border border-zinc-700 p-0.5">
                        <iconify-icon icon="solar:user-circle-linear" class="text-gray-300 text-2xl"></iconify-icon>
                    </div>
                    <div>
                        <div class="text-xs font-normal text-gray-200">Elena Rostova</div>
                        <div class="text-xs font-light text-gray-500">@elena_sys</div>
                    </div>
                </div>
            </div>

            <div class="absolute top-[83%] left-[62%] pointer-events-auto" data-float data-float-offset="0">
                <div class="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div class="rounded-full border border-zinc-700 p-0.5">
                        <iconify-icon icon="solar:user-circle-linear" class="text-gray-300 text-2xl"></iconify-icon>
                    </div>
                    <div>
                        <div class="text-xs font-normal text-gray-200">Marcus Chen</div>
                        <div class="text-xs font-light text-gray-500">@mchen_ops</div>
                    </div>
                </div>
                <div class="absolute -bottom-4 left-12 w-2 h-2 bg-white rounded-full">
                    <div class="absolute inset-0 rounded-full animate-ping bg-white opacity-75" style="animation-duration: 2s; animation-delay: 0.8s;"></div>
                </div>
            </div>

            <div class="absolute top-[40%] left-[78%] pointer-events-auto" data-float data-float-offset="0">
                <div class="absolute -top-10 -right-6 bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl px-4 py-2 w-max z-10">
                    <span class="text-xs font-light text-gray-300">Data routed.</span>
                </div>
                <div class="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-full p-2 relative z-0">
                    <div class="w-10 h-10 bg-zinc-800/80 rounded-full flex items-center justify-center shadow-inner">
                        <iconify-icon icon="solar:rocket-linear" class="text-white text-xl"></iconify-icon>
                    </div>
                </div>
                <div class="absolute top-12 left-6 w-2 h-2 bg-white rounded-full">
                    <div class="absolute inset-0 rounded-full animate-ping bg-white opacity-75" style="animation-duration: 2s; animation-delay: 1.5s;"></div>
                </div>
            </div>

            <div class="absolute top-[48%] left-[91%] pointer-events-auto" data-float data-float-offset="3">
                <div class="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-full p-2">
                    <div class="w-10 h-10 bg-zinc-900/80 rounded-full flex items-center justify-center shadow-inner border border-zinc-700/50">
                        <iconify-icon icon="solar:music-note-linear" class="text-white text-xl"></iconify-icon>
                    </div>
                </div>
                <div class="absolute -bottom-3 left-6 w-2 h-2 bg-white rounded-full">
                    <div class="absolute inset-0 rounded-full animate-ping bg-white opacity-75" style="animation-duration: 2s; animation-delay: 0.3s;"></div>
                </div>
            </div>

            <div class="absolute top-[68%] left-[86%] pointer-events-auto" data-float data-float-offset="0">
                <div class="absolute -top-10 -left-12 bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl px-4 py-2 w-max">
                    <span class="text-xs font-light text-gray-300">Connection secured.</span>
                </div>
                <div class="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-full p-2">
                    <div class="w-8 h-8 bg-zinc-800/80 border border-zinc-600/50 rounded-full flex items-center justify-center shadow-sm">
                        <iconify-icon icon="solar:bolt-linear" class="text-gray-200 text-lg"></iconify-icon>
                    </div>
                </div>
                <div class="absolute -bottom-3 left-5 w-2 h-2 bg-white rounded-full">
                    <div class="absolute inset-0 rounded-full animate-ping bg-white opacity-75" style="animation-duration: 2s; animation-delay: 1.1s;"></div>
                </div>
            </div>

        </div>

    </main>

    <script>
        const canvas = document.getElementById('animationCanvas');
        const ctx = canvas.getContext('2d');
        const floaters = document.querySelectorAll('[data-float]');
        
        let width, height;
        let time = 0;

        const numNodes = 120;
        const nodes = [];
        
        for(let i = 0; i < numNodes; i++) {
            let phi = Math.acos(-1 + (2 * i) / numNodes);
            let theta = Math.sqrt(numNodes * Math.PI) * phi;
            nodes.push({
                x: Math.cos(theta) * Math.sin(phi),
                y: Math.sin(theta) * Math.sin(phi),
                z: Math.cos(phi),
                baseSize: Math.random() * 1.5 + 0.5,
                pulseSpeed: Math.random() * 0.03 + 0.01,
                pulseOffset: Math.random() * Math.PI * 2
            });
        }

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        }

        window.addEventListener('resize', resize);
        resize();

        function drawNetwork() {
            ctx.clearRect(0, 0, width, height);
            
            const centerX = width > 768 ? width * 0.6 : width * 0.5;
            const centerY = width > 768 ? height * 0.6 : height * 0.7;
            const R = width > 768 ? 320 : 200;
            
            const glow = ctx.createRadialGradient(centerX, centerY, R * 0.8, centerX, centerY, R * 1.3);
            glow.addColorStop(0, 'rgba(255, 255, 255, 0)');
            glow.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
            glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(centerX - R * 1.5, centerY - R * 1.5, R * 3, R * 3);

            let angleY = time * 0.0004;
            let angleX = 0.25;

            let projectedNodes = nodes.map(n => {
                let y1 = n.y * Math.cos(angleX) - n.z * Math.sin(angleX);
                let z1 = n.y * Math.sin(angleX) + n.z * Math.cos(angleX);
                
                let x2 = n.x * Math.cos(angleY) + z1 * Math.sin(angleY);
                let z2 = -n.x * Math.sin(angleY) + z1 * Math.cos(angleY);
                
                return {
                    orig: n,
                    x: centerX + x2 * R,
                    y: centerY + y1 * R,
                    zNorm: z2 
                };
            });

            ctx.lineWidth = 0.6;
            for(let i = 0; i < projectedNodes.length; i++) {
                let p1 = projectedNodes[i];
                
                if(p1.zNorm < -0.3) continue; 

                for(let j = i + 1; j < projectedNodes.length; j++) {
                    let p2 = projectedNodes[j];
                    if(p2.zNorm < -0.3) continue;

                    let dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                    
                    const threshold = R * 0.45;
                    if(dist < threshold) {
                        let distAlpha = (1 - dist / threshold) * 0.25;
                        let depthAlpha = Math.min(1, (p1.zNorm + 0.3) * 1.5) * Math.min(1, (p2.zNorm + 0.3) * 1.5);
                        
                        ctx.strokeStyle = \`rgba(255, 255, 255, \${distAlpha * depthAlpha})\`;
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }

            projectedNodes.forEach(p => {
                if(p.zNorm < -0.4) return; 
                
                let alpha = Math.min(1, (p.zNorm + 0.4) * 2);
                let size = p.orig.baseSize + (p.zNorm > 0 ? p.zNorm * 0.8 : 0);
                let pulse = (Math.sin((time * p.orig.pulseSpeed) + p.orig.pulseOffset) + 1) / 2;

                ctx.fillStyle = \`rgba(255, 255, 255, \${alpha * 0.8})\`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();

                if (p.zNorm > 0 && pulse > 0.3) {
                    ctx.fillStyle = \`rgba(255, 255, 255, \${alpha * 0.2 * pulse})\`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, size * (1 + pulse * 3), 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            floaters.forEach(el => {
                const offset = Number(el.getAttribute('data-float-offset'));
                const y = Math.sin((time * 0.001) + offset) * 12;
                el.style.transform = \`translateY(\${y}px)\`;
            });

            time += 16;
            requestAnimationFrame(drawNetwork);
        }

        drawNetwork();
    <\/script>
</body>
</html>`,ye=`---
version: "alpha"
name: "Nexus Core - Autonomous Systems"
description: "Nexus Core Onboarding Section is designed for building reusable UI components in modern web projects. Key features include reusable structure, responsive behavior, and production-ready presentation. It is suitable for component libraries and responsive product interfaces."
colors:
  primary: "#00E5FF"
  secondary: "#0A0A0A"
  tertiary: "#0A3BFF"
  neutral: "#0A0A0A"
  background: "#00E5FF"
  surface: "#0A0A0A"
  text-primary: "#FFFFFF"
  text-secondary: "#00E5FF"
  border: "#FFFFFF"
  accent: "#00E5FF"
typography:
  display-lg:
    fontFamily: "Bricolage Grotesque"
    fontSize: "52px"
    fontWeight: 300
    lineHeight: "52px"
    letterSpacing: "-0.05em"
    textTransform: "uppercase"
  body-md:
    fontFamily: "System Font"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "22.75px"
  label-md:
    fontFamily: "SFMono-Regular"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "1.2px"
    textTransform: "uppercase"
rounded:
  md: "4px"
spacing:
  base: "4px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "14px"
  gap: "8px"
  card-padding: "32px"
  section-padding: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "14px"
  button-secondary:
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px"
  button-link:
    textColor: "{colors.text-primary}"
    rounded: "0px"
    padding: "0px"
  card:
    rounded: "0px"
    padding: "32px"
---

## Overview

- **Composition cues:**
  - Layout: Grid
  - Content Width: Bounded
  - Framing: Glassy
  - Grid: Strong

## Colors

The color system uses dark mode with #00E5FF as the main accent and #0A0A0A as the neutral foundation.

- **Primary (#00E5FF):** Main accent and emphasis color.
- **Secondary (#0A0A0A):** Supporting accent for secondary emphasis.
- **Tertiary (#0A3BFF):** Reserved accent for supporting contrast moments.
- **Neutral (#0A0A0A):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #00E5FF; Surface: #0A0A0A; Text Primary: #FFFFFF; Text Secondary: #00E5FF; Border: #FFFFFF; Accent: #00E5FF

- **Gradients:** bg-gradient-to-b from-white/20 to-transparent

## Typography

Typography pairs Bricolage Grotesque for display hierarchy with System Font for supporting content and interface copy.

- **Display (\`display-lg\`):** Bricolage Grotesque, 52px, weight 300, line-height 52px, letter-spacing -0.05em, uppercase.
- **Body (\`body-md\`):** System Font, 14px, weight 400, line-height 22.75px.
- **Labels (\`label-md\`):** SFMono-Regular, 12px, weight 600, line-height 16px, letter-spacing 1.2px, uppercase.

## Layout

Layout follows a grid composition with reusable spacing tokens. Preserve the grid, bounded structural frame before changing ornament or component styling. Use 4px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a grid / bounded composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Grid
- **Content width:** Bounded
- **Base unit:** 4px
- **Scale:** 4px, 8px, 12px, 14px, 16px, 20px, 24px, 32px
- **Section padding:** 32px, 56px
- **Card padding:** 32px, 56px
- **Gaps:** 8px, 16px, 24px, 32px

## Elevation & Depth

Depth is communicated through glass, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as glass first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Glass
- **Borders:** 1px #FFFFFF
- **Shadows:** rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.25) 0px 25px 50px -12px; rgb(0, 229, 255) 0px 0px 8px 0px
- **Blur:** 4px

## Shapes

Shapes rely on a tight radius system anchored by 2px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 2px, 4px, 20px, 9999px
- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Anchor interactions to the detected button styles. Reuse the existing card surface recipe for content blocks.

### Buttons
- **Primary:** background #00E5FF, text #000000, radius 4px, padding 14px, border 0px solid rgb(229, 231, 235).
- **Secondary:** text #FFFFFF, radius 4px, padding 8px, border 1px solid rgba(255, 255, 255, 0.2).
- **Links:** text #FFFFFF, radius 0px, padding 0px, border 0px solid rgb(229, 231, 235).

### Cards and Surfaces
- **Card surface:** radius 0px, padding 32px, shadow none.

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 4px rhythm.
- Do reuse the Glass surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 2px, 4px, 20px, 9999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 150ms and 2000ms. Easing favors ease and cubic-bezier(0.4. Hover behavior focuses on text and color changes.

**Motion Level:** moderate

**Durations:** 150ms, 2000ms

**Easings:** ease, cubic-bezier(0.4, 0, 1), 0.2, 0.6

**Hover Patterns:** text, color, stroke

## WebGL

Reconstruct the graphics as a inset 3d accent using webgl, renderer, alpha, antialias. The effect should read as retro-futurist, technical, and meditative: dot-matrix particle field with green on black and sparse spacing. Build it from dot particles + soft depth fade so the effect reads clearly. Animate it as slow breathing pulse. Interaction can react to the pointer, but only as a subtle drift. Preserve dom fallback.

**Id:** webgl

**Label:** WebGL

**Stack:** ThreeJS, WebGL

**Insights:**
  - **Scene:**
    - **Value:** Inset 3D accent
  - **Effect:**
    - **Value:** Dot-matrix particle field
  - **Primitives:**
    - **Value:** Dot particles + soft depth fade
  - **Motion:**
    - **Value:** Slow breathing pulse
  - **Interaction:**
    - **Value:** Pointer-reactive drift
  - **Render:**
    - **Value:** WebGL, Renderer, alpha, antialias

**Techniques:** Dot matrix, Breathing pulse, Pointer parallax, DOM fallback

**Code Evidence:**
  - **HTML reference:**
    - **Language:** html
    - **Snippet:**
      \`\`\`html
      <canvas width="1200" height="1344" style="display: block; width: 600px; height: 672px;"></canvas>
      \`\`\`
  - **JS reference:**
    - **Language:** js
    - **Snippet:**
      \`\`\`
      document.addEventListener('DOMContentLoaded', () => {
          const container = document.getElementById('webgl-container');
          if (!container) return;

          // Scene setup
          const scene = new THREE.Scene();

          // Isometric Camera setup
      …
      \`\`\`
  - **Renderer setup:**
    - **Language:** js
    - **Snippet:**
      \`\`\`
      const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
      camera.position.set(20, 20, 20);
      camera.lookAt(scene.position);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);
      \`\`\`
  - **Scene setup:**
    - **Language:** js
    - **Snippet:**
      \`\`\`
      const container = document.getElementById('webgl-container');
      if (!container) return;

      // Scene setup
      const scene = new THREE.Scene();

      // Isometric Camera setup
      const aspect = container.clientWidth / container.clientHeight;
      …
      \`\`\`

## ThreeJS

Reconstruct the Three.js layer as a inset 3d accent that feels retro-futurist and technical. Use alpha, antialias renderer settings, orthographic projection, box geometry, meshstandardmaterial materials, and ambient + directional + point lighting. Motion should read as slow orbital drift, with poster frame + dom fallback.

**Id:** threejs

**Label:** ThreeJS

**Stack:** ThreeJS, WebGL

**Insights:**
  - **Scene:**
    - **Value:** Inset 3D accent
  - **Render:**
    - **Value:** alpha, antialias
  - **Camera:**
    - **Value:** Orthographic projection
  - **Lighting:**
    - **Value:** ambient + directional + point
  - **Materials:**
    - **Value:** MeshStandardMaterial
  - **Geometry:**
    - **Value:** box
  - **Motion:**
    - **Value:** Slow orbital drift

**Techniques:** PBR shading, Timeline beats, alpha, antialias, Poster frame + DOM fallback

**Code Evidence:**
  - **HTML reference:**
    - **Language:** html
    - **Snippet:**
      \`\`\`html
      <canvas width="1200" height="1344" style="display: block; width: 600px; height: 672px;"></canvas>
      \`\`\`
  - **JS reference:**
    - **Language:** js
    - **Snippet:**
      \`\`\`
      document.addEventListener('DOMContentLoaded', () => {
          const container = document.getElementById('webgl-container');
          if (!container) return;

          // Scene setup
          const scene = new THREE.Scene();

          // Isometric Camera setup
      …
      \`\`\`
  - **Renderer setup:**
    - **Language:** js
    - **Snippet:**
      \`\`\`
      const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
      camera.position.set(20, 20, 20);
      camera.lookAt(scene.position);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);
      \`\`\`
  - **Scene setup:**
    - **Language:** js
    - **Snippet:**
      \`\`\`
      const container = document.getElementById('webgl-container');
      if (!container) return;

      // Scene setup
      const scene = new THREE.Scene();

      // Isometric Camera setup
      const aspect = container.clientWidth / container.clientHeight;
      …
      \`\`\`
`,ve=`<!doctype html>
<html lang="en"><head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nexus Core - Autonomous Systems</title>
    <script src="https://tailwind-dummy.local"><\/script>
    <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"><\/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
    <link href="fonts-dummy.local/css2?family=Inter:wght@400;500;600&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap" rel="stylesheet">
<link id="all-fonts-link-font-bricolage" rel="stylesheet" href="fonts-dummy.local/css2?family=Bricolage+Grotesque:wght@300;400;500;600;700&amp;display=swap"><style id="all-fonts-style-font-bricolage">.font-bricolage { font-family: 'Bricolage Grotesque', sans-serif !important; }</style></head>
<body class="bg-[#050505] text-white font-sans antialiased min-h-screen flex items-center justify-center p-4 md:p-8" style="background-image: radial-gradient(circle at 50% 0%, #00e5ff15 0%, transparent 70%); font-family: 'Inter', sans-serif;">

    <div class="w-full max-w-[1280px] bg-[#0a0a0a] border border-white/10 rounded-[20px] shadow-2xl overflow-hidden flex flex-col relative z-10">
        
        <!-- Header -->
        <header class="flex items-center justify-between px-8 py-5 border-b border-white/5">
            <div class="flex items-center gap-2 text-white">
                <iconify-icon icon="solar:cpu-linear" style="font-size: 1.25rem;" stroke-width="1.5"></iconify-icon>
                <span class="font-mono text-xs tracking-widest font-semibold uppercase font-sans">NEXUS.CORE</span>
            </div>
            
            <nav class="hidden md:flex items-center gap-8">
                <a href="#" class="font-mono text-xs text-white/50 hover:text-white uppercase tracking-widest transition-colors font-sans">Platform</a>
                <a href="#" class="font-mono text-xs text-white/50 hover:text-white uppercase tracking-widest transition-colors font-sans">Modules</a>
                <a href="#" class="font-mono text-xs text-white/50 hover:text-white uppercase tracking-widest transition-colors font-sans">Metrics</a>
                <a href="#" class="font-mono text-xs text-white/50 hover:text-white uppercase tracking-widest transition-colors font-sans">API</a>
                <a href="#" class="font-mono text-xs text-white/50 hover:text-white uppercase tracking-widest transition-colors font-sans">Enterprise</a>
            </nav>

            <div class="flex items-center gap-6">
                <a href="#" class="font-mono text-xs text-white/60 hover:text-white uppercase tracking-widest hidden sm:block font-sans">Authenticate</a>
                <button class="border border-white/20 hover:border-[#00e5ff] hover:text-[#00e5ff] text-white px-4 py-2 rounded uppercase font-mono text-xs tracking-widest transition-all font-sans">
                    Initialize
                </button>
            </div>
        </header>

        <!-- Main Hero -->
        <main class="flex flex-col lg:flex-row border-b border-white/5">
            
            <!-- Left Column: Copy -->
            <div class="lg:w-1/2 p-8 lg:p-14 border-r border-white/5 flex flex-col justify-center relative">
                
                <div class="inline-flex items-center gap-2 border border-white/10 rounded-full px-3 py-1 w-fit mb-8 bg-white/5">
                    <div class="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" style="box-shadow: 0 0 8px #00e5ff;"></div>
                    <span class="font-mono text-[10px] text-white/60 tracking-widest uppercase font-sans">Network Secure · v2.1</span>
                </div>

                <h1 class="text-4xl sm:text-5xl lg:text-[52px] uppercase leading-[1.1] text-white mb-6 font-bricolage font-light tracking-tighter" style="font-family: 'Inter', sans-serif;">
                    Orchestrate <br> Systems <br>
                    <span class="text-[#00e5ff] font-bricolage font-light tracking-tighter">Intelligently</span>
                </h1>

                <p class="text-sm text-white/50 max-w-[400px] leading-relaxed mb-10 font-sans">
                    NEXUS.CORE initiates neural nodes that process, route, and optimize data streams across your architecture with absolute precision and limitless scalability.
                </p>

                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-20">
                    <button class="bg-[#00e5ff] hover:bg-[#00cce5] text-black px-6 py-3.5 rounded uppercase font-mono text-xs font-semibold tracking-widest transition-colors flex items-center gap-2 w-full sm:w-auto justify-center font-sans">
                        Commence Sync
                        <iconify-icon icon="solar:arrow-right-linear" style="font-size: 1rem;" stroke-width="1.5"></iconify-icon>
                    </button>
                    <button class="border border-white/10 hover:bg-white/5 text-white px-6 py-3.5 rounded uppercase font-mono text-xs tracking-widest transition-colors flex items-center gap-2 w-full sm:w-auto justify-center font-sans">
                        <iconify-icon icon="solar:play-circle-linear" style="font-size: 1.1rem;" stroke-width="1.5"></iconify-icon>
                        View Telemetry
                    </button>
                </div>

                <div class="mt-auto pt-8">
                    <p class="font-mono text-[10px] text-white/40 tracking-widest uppercase mb-4 font-sans">Integrated with networks:</p>
                    <div class="flex flex-wrap items-center gap-6 sm:gap-10 opacity-60 grayscale">
                        <span class="font-serif italic text-base tracking-wider text-white/80 font-sans">Cybernet</span>
                        <span class="font-semibold tracking-tighter text-sm text-white/80 font-sans">DATAGRID</span>
                        <span class="font-mono lowercase text-sm tracking-wide text-white/80 font-sans">sys.logic</span>
                        <span class="font-medium text-sm tracking-tight text-white/80 font-sans">Aethra</span>
                        <span class="font-serif uppercase text-xs tracking-widest text-white/80 font-sans">VORTEX</span>
                    </div>
                </div>

            </div>

            <!-- Right Column: WebGL / Graphic -->
            <div class="lg:w-1/2 relative bg-[#060606] min-h-[400px] lg:min-h-0 overflow-hidden flex items-center justify-center p-8">
                
                <!-- Top Labels -->
                <div class="absolute top-8 left-8 right-8 flex justify-between items-center z-20">
                    <span class="font-mono text-[10px] text-white/40 tracking-widest uppercase font-sans">// Neural Net Grid</span>
                    <div class="flex items-center gap-2">
                        <div class="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse"></div>
                        <span class="font-mono text-[10px] text-[#00e5ff] tracking-widest uppercase font-sans">Synced</span>
                    </div>
                </div>

                <!-- Floating UI Label -->
                <div class="absolute top-[20%] left-[50%] -translate-x-[50%] z-20 flex flex-col items-center">
                    <div class="border border-white/20 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-sm flex flex-col items-center border-t-[#00e5ff]">
                        <span class="font-mono text-xs text-[#00e5ff] font-sans">Logic Core</span>
                        <span class="font-mono text-[10px] text-white/60 mt-1 font-sans">Main Processor</span>
                    </div>
                    <!-- Connecting Line -->
                    <div class="w-px h-16 bg-gradient-to-b from-white/20 to-transparent"></div>
                </div>

                <!-- WebGL Container -->
                <div id="webgl-container" class="absolute inset-0 z-10 pointer-events-none"></div>

            </div>
        </main>

        <!-- Footer Stats -->
        <div class="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-white/5 bg-[#0a0a0a]">
            
            <div class="p-6 md:p-8 flex flex-col items-center justify-center text-center">
                <span class="text-3xl text-[#00e5ff] font-semibold tracking-tight font-sans">84</span>
                <span class="font-mono text-[10px] text-white/40 tracking-widest uppercase mt-3 font-sans">Nodes Active</span>
            </div>
            
            <div class="p-6 md:p-8 flex flex-col items-center justify-center text-center">
                <span class="text-3xl text-[#00e5ff] font-semibold tracking-tight font-sans">3.2M</span>
                <span class="font-mono text-[10px] text-white/40 tracking-widest uppercase mt-3 font-sans">Req/Sec</span>
            </div>
            
            <div class="p-6 md:p-8 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1">
                <span class="text-3xl text-[#00e5ff] font-semibold tracking-tight font-sans">914</span>
                <span class="font-mono text-[10px] text-white/40 tracking-widest uppercase mt-3 font-sans">Cycles Saved</span>
            </div>
            
            <div class="p-6 md:p-8 flex flex-col items-center justify-center text-center">
                <span class="text-3xl text-[#00e5ff] font-semibold tracking-tight font-sans">99.99%</span>
                <span class="font-mono text-[10px] text-white/40 tracking-widest uppercase mt-3 font-sans">Stability</span>
            </div>
            
            <div class="p-6 md:p-8 flex flex-col items-center justify-center text-center">
                <span class="text-3xl text-[#00e5ff] font-semibold tracking-tight font-sans">256+</span>
                <span class="font-mono text-[10px] text-white/40 tracking-widest uppercase mt-3 font-sans">Integrations</span>
            </div>

        </div>
    </div>

    <!-- WebGL Script -->
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const container = document.getElementById('webgl-container');
            if (!container) return;

            // Scene setup
            const scene = new THREE.Scene();
            
            // Isometric Camera setup
            const aspect = container.clientWidth / container.clientHeight;
            const d = 15;
            const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
            camera.position.set(20, 20, 20);
            camera.lookAt(scene.position);

            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            container.appendChild(renderer.domElement);

            // Lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(10, 20, 10);
            scene.add(directionalLight);

            const coreLight = new THREE.PointLight(0x00e5ff, 2, 20);
            coreLight.position.set(0, 2, 0);
            scene.add(coreLight);

            // Materials
            const darkMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x111111, 
                roughness: 0.8,
                metalness: 0.2
            });
            const accentMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x00e5ff, 
                emissive: 0x00e5ff,
                emissiveIntensity: 0.5,
                roughness: 0.2,
                metalness: 0.8
            });
            const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.3 });
            const gridMaterial = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.3 });

            // Geometry Group to hold everything
            const group = new THREE.Group();
            scene.add(group);

            // 1. Base Grid (Floor)
            const gridHelper = new THREE.GridHelper(30, 15, 0x333333, 0x1a1a1a);
            gridHelper.position.y = -2;
            group.add(gridHelper);

            // 2. Main Platform
            const platformGeo = new THREE.BoxGeometry(14, 1.5, 14);
            const platform = new THREE.Mesh(platformGeo, darkMaterial);
            platform.position.y = -1;
            
            // Platform edges
            const edges = new THREE.EdgesGeometry(platformGeo);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x333333 }));
            platform.add(line);
            group.add(platform);

            // 3. Middle Tier
            const midTierGeo = new THREE.BoxGeometry(8, 1, 8);
            const midTier = new THREE.Mesh(midTierGeo, darkMaterial);
            midTier.position.y = 0.25;
            
            const midEdges = new THREE.EdgesGeometry(midTierGeo);
            const midLine = new THREE.LineSegments(midEdges, new THREE.LineBasicMaterial({ color: 0x444444 }));
            midTier.add(midLine);
            group.add(midTier);

            // 4. Glowing Core
            const coreGeo = new THREE.BoxGeometry(3, 1, 3);
            const core = new THREE.Mesh(coreGeo, accentMaterial);
            core.position.y = 1.25;
            group.add(core);

            // 5. Holographic Rings (Wireframe Cylinders)
            const ringGeo = new THREE.CylinderGeometry(4.5, 4.5, 1.5, 32, 1, true);
            const ring1 = new THREE.LineSegments(new THREE.EdgesGeometry(ringGeo), wireframeMaterial);
            ring1.position.y = 4;
            group.add(ring1);

            const ring2 = new THREE.LineSegments(new THREE.EdgesGeometry(ringGeo), wireframeMaterial);
            ring2.position.y = 7;
            group.add(ring2);

            // 6. Floating Data Nodes
            const nodes = [];
            const nodeGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
            for(let i=0; i<6; i++) {
                const node = new THREE.Mesh(nodeGeo, accentMaterial);
                
                // Random position around the center
                const angle = (i / 6) * Math.PI * 2;
                const radius = 8 + Math.random() * 2;
                node.position.x = Math.cos(angle) * radius;
                node.position.z = Math.sin(angle) * radius;
                node.position.y = Math.random() * 4 + 1;
                
                // Add wireframe box around node
                const nodeEdges = new THREE.EdgesGeometry(nodeGeo);
                const nodeWire = new THREE.LineSegments(nodeEdges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
                nodeWire.scale.set(1.5, 1.5, 1.5);
                node.add(nodeWire);

                // Store initial Y for bouncing animation
                node.userData.startY = node.position.y;
                node.userData.speed = 0.02 + Math.random() * 0.02;
                node.userData.offset = Math.random() * Math.PI * 2;

                group.add(node);
                nodes.push(node);
            }

            // Small decorative elements on platform
            const decorGeo = new THREE.BoxGeometry(0.8, 0.4, 1.5);
            const decorMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff });
            for(let i=0; i<3; i++) {
                const decor = new THREE.Mesh(decorGeo, decorMat);
                decor.position.set(4, 0.25, -2 + i * 2);
                group.add(decor);
            }

            // Animation Loop
            const clock = new THREE.Clock();

            function animate() {
                requestAnimationFrame(animate);
                const time = clock.getElapsedTime();

                // Rotate group slowly
                group.rotation.y = Math.sin(time * 0.1) * 0.1;

                // Animate Rings
                ring1.rotation.y = time * 0.5;
                ring2.rotation.y = -time * 0.3;
                
                // Pulse core emissive
                const pulse = (Math.sin(time * 3) + 1) * 0.5; // 0 to 1
                accentMaterial.emissiveIntensity = 0.3 + pulse * 0.7;
                coreLight.intensity = 1 + pulse;

                // Bounce nodes
                nodes.forEach(node => {
                    node.position.y = node.userData.startY + Math.sin(time * 2 + node.userData.offset) * 0.5;
                    node.rotation.x += 0.01;
                    node.rotation.y += 0.01;
                });

                renderer.render(scene, camera);
            }

            animate();

            // Handle Resize
            window.addEventListener('resize', () => {
                if(!container) return;
                const newAspect = container.clientWidth / container.clientHeight;
                camera.left = -d * newAspect;
                camera.right = d * newAspect;
                camera.top = d;
                camera.bottom = -d;
                camera.updateProjectionMatrix();
                renderer.setSize(container.clientWidth, container.clientHeight);
            });
        });
    <\/script>

</body></html>`,m="design_systems",h="id, slug, title, description, content, preview_html, preview_file_name, thumbnail_url, source_name, views, forks, private, featured, created_by, created_at, updated_at",q="design-system-thumbnails",Se=2e3,J="aura_design_systems_v1",K="aura_design_system_counters_v1",Z="local-design-author",E="9109ecbb-cdc4-4815-981e-2ea83be13765",Y="Meng To",V="https://offline.aura-clone.local/storage/v1/object/public/user-avatars/avatars/9109ecbb-cdc4-4815-981e-2ea83be13765-1747961036177.png",X="meng",G=[{id:"aeronet-visualization-design",slug:"aeronet-visualization",content:we,previewHtml:be,previewFileName:"AeroNet-Visualization.html",sourceName:"AeroNet-Visualization-DESIGN.md",views:0,forks:0,private:!1,featured:!0,created_by:E,created_at:"2026-04-28T08:50:33.000Z",updated_at:"2026-04-28T08:50:33.000Z",authorName:Y,avatarUrl:V,userSlug:X},{id:"nexus-core-autonomous-systems-design",slug:"nexus-core-autonomous-systems",content:ye,previewHtml:ve,previewFileName:"Nexus-Core---Autonomous-Systems.html",sourceName:"Nexus-Core---Autonomous-Systems-DESIGN.md",views:0,forks:0,private:!1,featured:!0,created_by:E,created_at:"2026-04-28T08:52:33.000Z",updated_at:"2026-04-28T08:52:33.000Z",authorName:Y,avatarUrl:V,userSlug:X}],Q=new Set(G.map(e=>e.id)),B=e=>e.trim().replace(/^["']|["']$/g,"").trim(),F=e=>e.replace(/\r\n/g,`
`),k=e=>e.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""),ee=e=>{const t=F(e).match(/^---\n([\s\S]*?)\n---\n?/);return(t==null?void 0:t[1])||""},L=e=>{const n=F(e),t=n.match(/^---\n([\s\S]*?)\n---\n?/);return t?n.slice(t[0].length):n},N=(e,n)=>{const t=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),a=e.match(new RegExp(`^${t}:\\s*(.+)$`,"m"));return a?B(a[1]):void 0},ne=(e,n)=>{const t=e.split(`
`),a=t.findIndex(r=>r.trim()===`${n}:`);if(a<0)return[];const s=[];for(let r=a+1;r<t.length;r+=1){const i=t[r];if(i.trim()&&!i.startsWith(" "))break;i.trim()&&s.push(i)}return s},C=(e,n)=>ne(e,n).reduce((a,s)=>{const r=s.match(/^ {2}([^:]+):\s*(.+)$/);return r&&(a[r[1].trim()]=B(r[2])),a},{}),te=(e,n)=>{const t=ne(e,n),a={};let s="";return t.forEach(r=>{const i=r.match(/^ {2}([^:]+):\s*$/);if(i){s=i[1].trim(),a[s]={};return}const o=r.match(/^ {4}([^:]+):\s*(.+)$/);o&&s&&(a[s][o[1].trim()]=B(o[2]))}),a},Ee=e=>{const n=te(e,"typography");return Object.entries(n).reduce((t,[a,s])=>(t[a]=s,t),{})},Fe=e=>(L(e).match(/^##\s+(.+)$/gm)||[]).map(a=>a.replace(/^##\s+/,"").trim()).filter(Boolean),_=e=>{const n=ee(e),t=L(e).match(/^#\s+(.+)$/m),a=N(n,"name")||(t?t[1].trim():"Untitled Design System"),s=N(n,"description")||L(e).replace(/[#>*_`-]/g," ").replace(/\s+/g," ").trim().slice(0,180);return{title:a,description:s,version:N(n,"version")}},ke=e=>{const n=ee(e);return{colors:C(n,"colors"),typography:Ee(n),spacing:C(n,"spacing"),rounded:C(n,"rounded"),components:te(n,"components"),sections:Fe(e)}},w=e=>{const n=_(e.content);return{...e,title:e.title||n.title,description:e.description||n.description,version:e.version||n.version,tokens:ke(e.content)}},ae=e=>{const n=e==null?void 0:e.trim();if(n)return n.startsWith("/")?n:he(n)||n},Me=e=>/^(https?:|data:image\/|blob:)/i.test(e)||e.startsWith("/")||e.includes("/")||/\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(e),Te=e=>{const n=e==null?void 0:e.trim();if(!(!n||!Me(n)))return ae(n)},ie=async()=>{const{data:{user:e}}=await u.auth.getUser();return(e==null?void 0:e.id)||null},I=(e,n)=>n?e.or(`private.eq.false,created_by.eq.${n}`):e.eq("private",!1),S=(e,n)=>!e.private||e.created_by===Z||!!(n&&e.created_by===n),x=e=>{const n=`${(e==null?void 0:e.message)||""} ${(e==null?void 0:e.details)||""}`;return(e==null?void 0:e.code)==="42P01"||(e==null?void 0:e.code)==="PGRST205"||/design_systems/i.test(n)&&/(does not exist|schema cache|could not find|not found)/i.test(n)},_e=e=>{const n=e&&typeof e=="object"?e:{},t=`${String(n.message||"")} ${String(n.details||"")}`;return n.code==="23505"&&/design_systems_slug_key|duplicate key value/i.test(t)&&/slug/i.test(t)},De=e=>{const n=e||"design-system",t=`${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;return`${n}-${t}`},b=(e,n={})=>{const t=e.created_by?n[e.created_by]:void 0;return w({id:e.id,slug:e.slug,title:e.title||void 0,description:e.description||void 0,content:e.content,previewHtml:e.preview_html||void 0,previewFileName:e.preview_file_name||void 0,thumbnailUrl:ae(e.thumbnail_url),sourceName:e.source_name||void 0,views:e.views??0,forks:e.forks??0,private:e.private??!1,featured:e.featured??!1,created_by:e.created_by,created_at:e.created_at,updated_at:e.updated_at,authorName:(t==null?void 0:t.full_name)||void 0,avatarUrl:Te(t==null?void 0:t.avatar_url),userSlug:(t==null?void 0:t.slug)||void 0})},M=async e=>{const n=[...new Set(e.filter(Boolean))];if(!n.length)return{};try{const{data:t,error:a}=await u.from("public_author_profiles").select("id, full_name, avatar_url, slug").in("id",n);return a||!t?(a&&console.warn("Failed to fetch design system authors:",a),{}):t.reduce((s,r)=>(s[r.id]=r,s),{})}catch(t){return console.warn("Failed to fetch design system authors:",t),{}}},Re=async e=>{const n=I(u.from(m).select(h).limit(1e3),e),{data:t,error:a}=await n;if(a)throw a;const s=t||[],r=await M(s.map(i=>i.created_by));return s.map(i=>b(i,r))},j=()=>{if(typeof window>"u")return[];try{const e=window.localStorage.getItem(J);if(!e)return[];const n=JSON.parse(e);return Array.isArray(n)?n:[]}catch(e){return console.warn("Failed to load saved design systems:",e),[]}},se=e=>{typeof window>"u"||window.localStorage.setItem(J,JSON.stringify(e))},oe=()=>{if(typeof window>"u")return{};try{const e=window.localStorage.getItem(K);if(!e)return{};const n=JSON.parse(e);return n&&typeof n=="object"&&!Array.isArray(n)?n:{}}catch(e){return console.warn("Failed to load design system counters:",e),{}}},Ae=e=>{typeof window>"u"||window.localStorage.setItem(K,JSON.stringify(e))},re=(e,n,t)=>{const a=oe();a[e]={...a[e],[n]:t},Ae(a)},P=()=>G.map(e=>w(e)),g=()=>{const e=new Map;P().forEach(t=>{e.set(t.id,t)}),j().forEach(t=>{if(t.deleted){e.delete(t.id);return}const a=e.get(t.id);if(a){const{tokens:s,...r}=a;e.set(t.id,w({...r,...t,created_by:a.created_by,authorName:a.authorName,avatarUrl:a.avatarUrl,userSlug:a.userSlug,views:a.views,forks:a.forks,previewHtml:t.previewHtml||a.previewHtml,previewFileName:t.previewFileName||a.previewFileName}));return}e.set(t.id,w(t))});const n=oe();return Array.from(e.values()).map(t=>{const a=n[t.id];return a?{...t,views:a.views??t.views,forks:a.forks??t.forks}:t})};let v=null;const le=()=>typeof window>"u"?Promise.resolve(null):v||(v=(async()=>{const{data:{user:e}}=await u.auth.getUser();if((e==null?void 0:e.id)!==E)return null;const n=P(),{data:t,error:a}=await u.from(m).upsert(n.map(i=>({slug:i.slug,title:i.title,description:i.description,content:i.content,preview_html:i.previewHtml,preview_file_name:i.previewFileName,source_name:i.sourceName,private:i.private,featured:i.featured,created_by:E})),{onConflict:"slug"}).select(h);if(a||!t)return a&&console.warn("Failed to seed design systems:",a),null;const s=[...t];for(let i=0;i<s.length;i+=1){const o=s[i];if(!(!o.preview_html||o.thumbnail_url))try{const c=await W({id:o.id,slug:o.slug,previewHtml:o.preview_html});if(!c)continue;const l=await u.from(m).update({thumbnail_url:c}).eq("id",o.id).select(h).single();!l.error&&l.data&&(s[i]=l.data)}catch(c){console.warn("Failed to seed design system thumbnail:",c)}}const r=await M([E]);return s.map(i=>b(i,r))})().finally(()=>{v=null}),v);async function Be(e=100,n="random",t){const a=t===void 0?await ie():t;let s;try{s=await Re(a),s.length||(s=await le()||g())}catch(i){if(!x(i))throw i;console.warn("Design systems table is not available yet; using local seed fallback.",i),s=g()}if(s=s.filter(i=>S(i,a)),n==="random"){const i=[...s];for(let o=i.length-1;o>0;o-=1){const c=Math.floor(Math.random()*(o+1));[i[o],i[c]]=[i[c],i[o]]}return i.slice(0,e)}return[...s].sort((i,o)=>n==="recent"?new Date(o.updated_at).getTime()-new Date(i.updated_at).getTime():n==="name"?i.title.localeCompare(o.title):o.views+o.forks*3-(i.views+i.forks*3)).slice(0,e)}async function je(e,n){const t=n===void 0?await ie():n;try{let{data:a,error:s}=await I(u.from(m).select(h).eq("slug",e),t).maybeSingle();if(s)throw s;if(!a&&T(e)){const c=await I(u.from(m).select(h).eq("id",e),t).maybeSingle();if(c.error)throw c.error;a=c.data}if(!a){const c=await le(),l=c==null?void 0:c.find(p=>p.slug===e||p.id===e);if(l&&S(l,t))return l;const d=g().find(p=>p.slug===e||p.id===e)||null;return d&&S(d,t)?d:null}const r=a,i=await M([r.created_by]),o=b(r,i);return S(o,t)?o:null}catch(a){if(!x(a))throw a;const r=g().find(i=>i.slug===e||i.id===e)||null;return r&&S(r,t)?r:null}}const D=e=>{const n=j().filter(s=>s.id!==e.id),{tokens:t,...a}=e;n.push(a),se(n)},T=e=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(e),ce=(e,n)=>{const t=new Set(g().filter(r=>r.id!==n).map(r=>r.slug));let a=e||"design-system",s=2;for(;t.has(a);)a=`${e}-${s}`,s+=1;return a},z=async(e,n)=>{const t=e||"design-system",{data:a,error:s}=await u.from(m).select("id, slug").ilike("slug",`${t}%`).limit(500);if(s)throw s;const r=new Set((a||[]).filter(c=>c.id!==n).map(c=>c.slug));let i=t,o=2;for(;r.has(i);)i=`${t}-${o}`,o+=1;return i},He=e=>{var t,a;if(e.type==="image/png")return"png";if(e.type==="image/webp")return"webp";if(e.type==="image/jpeg")return"jpg";const n=(a=(t=e.name)==null?void 0:t.split(".").pop())==null?void 0:a.toLowerCase();return n==="png"||n==="webp"||n==="jpg"?n:"jpg"},Ne=(e,n="jpg")=>`${e.id}/${e.slug}.${n}`,U=async(e,n)=>{const t=He(n),a=Ne(e,t),{error:s}=await u.storage.from(q).upload(a,n,{contentType:n.type||"image/jpeg",upsert:!0});if(s)throw s;return`${q}/${a}`},de=async(e,n)=>{if(typeof window>"u"||!e)throw new Error("No HTML preview is available to capture.");return ge({html:e,baseHref:window.location.origin,requestBody:{fullPage:!1,format:"jpeg",quality:90,viewport:{width:1440,height:1080,deviceScaleFactor:1},outputWidth:960,outputHeight:720,renderWidth:1440,renderHeight:1080,waitForMs:(n==null?void 0:n.waitForMs)??Se,navigationTimeoutMs:6e3,timeoutMs:9e3,screenshotTimeoutMs:6e3,blockResourceTypes:["media"],blockUrls:[],skipFonts:!1,debug:!1},timeoutMs:xe+2500})},Pe=async(e,n)=>{const t=await de(e,n),a=k((n==null?void 0:n.title)||"design-system")||"design-system";return new File([t],`${a}-thumbnail.jpg`,{type:t.type||"image/jpeg"})},W=async(e,n)=>{if(typeof window>"u"||!e.previewHtml)return;const t=await de(e.previewHtml,n);return U(e,t)};async function Ue(e){var r,i;const n=F(e.content.trim()),t=_(n),a=((r=e.title)==null?void 0:r.trim())||t.title,s=((i=e.description)==null?void 0:i.trim())||t.description;try{const o=k(a);let c=await z(o),l=null;for(let d=0;d<4;d+=1){const{data:p,error:y}=await u.from(m).insert({slug:c,title:a,description:s,content:n,preview_html:e.previewHtml,preview_file_name:e.previewFileName,thumbnail_url:e.thumbnailUrl,source_name:e.sourceName,private:!0}).select(h).single();if(!y&&p){l=p;break}if(!_e(y)||d===3)throw y;c=await z(De(o))}if(!l)throw new Error("Failed to create design system");if(e.thumbnailFile){const d=await U({id:l.id,slug:l.slug},e.thumbnailFile),p=await u.from(m).update({thumbnail_url:d}).eq("id",l.id).select(h).single();!p.error&&p.data&&(l=p.data)}else if(!l.thumbnail_url&&l.preview_html)try{const d=await W({id:l.id,slug:l.slug,previewHtml:l.preview_html},{waitForMs:e.thumbnailCaptureWaitForMs});if(d){const p=await u.from(m).update({thumbnail_url:d}).eq("id",l.id).select(h).single();!p.error&&p.data&&(l=p.data)}}catch(d){console.warn("Failed to capture design system thumbnail:",d)}const f=await M([l.created_by]);return b(l,f)}catch(o){if(!x(o))throw o;const c=k(a),l=ce(c),f=new Date().toISOString(),d=w({id:`local-${l}-${Date.now()}`,slug:l,title:a,description:s,content:n,previewHtml:e.previewHtml,previewFileName:e.previewFileName,thumbnailUrl:e.thumbnailUrl,sourceName:e.sourceName,views:0,forks:0,private:!0,featured:!1,created_by:Z,created_at:f,updated_at:f,authorName:e.authorName||"You",userSlug:void 0});return D(d),d}}async function We(e,n){var t,a,s,r;try{const{data:i,error:o}=await u.from(m).select(h).eq("id",e).single();if(o)throw o;const c=i,l=b(c),f=n.content?F(n.content.trim()):l.content,d=_(f),p=((t=n.title)==null?void 0:t.trim())||l.title||d.title,y=((a=n.description)==null?void 0:a.trim())||l.description||d.description,R=await z(k(p),e),A=n.previewHtml??l.previewHtml,pe=n.previewFileName??l.previewFileName;let H=n.thumbnailUrl??c.thumbnail_url;if(n.thumbnailFile)H=await U({id:e,slug:R},n.thumbnailFile);else if(A&&n.previewHtml!==void 0&&n.previewHtml!==l.previewHtml&&n.thumbnailUrl===void 0)try{H=await W({id:e,slug:R,previewHtml:A},{waitForMs:n.thumbnailCaptureWaitForMs})}catch(fe){console.warn("Failed to capture design system thumbnail:",fe)}const{data:ue,error:$}=await u.from(m).update({slug:R,title:p,description:y,content:f,preview_html:A,preview_file_name:pe,thumbnail_url:H,source_name:n.sourceName??l.sourceName,private:n.private??l.private}).eq("id",e).select(h).single();if($)throw $;const O=ue,me=await M([O.created_by]);return b(O,me)}catch(i){if(!x(i)&&T(e))throw i;const o=g().find(p=>p.id===e);if(!o)throw new Error("Design system not found");const c=n.content?F(n.content.trim()):o.content,l=_(c),f=((s=n.title)==null?void 0:s.trim())||o.title||l.title,d=w({...o,title:f,description:((r=n.description)==null?void 0:r.trim())||o.description||l.description,content:c,previewHtml:n.previewHtml??o.previewHtml,previewFileName:n.previewFileName??o.previewFileName,thumbnailUrl:n.thumbnailUrl??o.thumbnailUrl,sourceName:n.sourceName??o.sourceName,authorName:n.authorName??o.authorName,private:n.private??o.private,slug:ce(k(f),e),updated_at:new Date().toISOString()});return D(d),d}}async function $e(e){try{const{error:n}=await u.from(m).delete().eq("id",e);if(n)throw n}catch(n){if(!x(n)&&T(e))throw n;const t=G.some(s=>s.id===e),a=j().filter(s=>s.id!==e);if(t){const s=P().find(r=>r.id===e);if(s){const{tokens:r,...i}=s;a.push({...i,deleted:!0})}}se(a)}}async function Oe(e){if(T(e))try{const{error:t}=await u.rpc("increment_design_system_views",{design_system_id:e});if(t)throw t;return}catch(t){if(!x(t)){console.error("Failed to increment design system views:",t);return}}const n=g().find(t=>t.id===e);if(n){if(Q.has(e)){re(e,"views",n.views+1);return}D({...n,views:n.views+1})}}async function qe(e){if(T(e))try{const{error:t}=await u.rpc("increment_design_system_forks",{design_system_id:e});if(t)throw t;return}catch(t){if(!x(t)){console.error("Failed to increment design system forks:",t);return}}const n=g().find(t=>t.id===e);if(n){if(Q.has(e)){re(e,"forks",n.forks+1);return}D({...n,forks:n.forks+1})}}export{Pe as captureDesignSystemThumbnailFile,Ue as createDesignSystem,$e as deleteDesignSystem,_ as extractDesignSystemMetadata,ke as extractDesignSystemTokens,je as getDesignSystemBySlug,ee as getDesignSystemFrontmatter,qe as incrementDesignSystemForks,Oe as incrementDesignSystemViews,Be as listDesignSystems,k as toDesignSystemSlug,We as updateDesignSystem};
