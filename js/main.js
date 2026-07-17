    //   <script>
        /* ---- orbit dial function ---- */
        (function () {
          var track = document.getElementById('orbitTrack');
          var titleTextEl = document.getElementById('orbitTitle');
          var titleImageEl = document.getElementById('orbitTitleImage');
          var titleEl = titleImageEl || titleTextEl;
          if (!track || !titleEl || typeof gsap === 'undefined' || typeof Draggable === 'undefined') {
            return;
          }

          var wrappers = Array.prototype.slice.call(track.querySelectorAll('.orbit-card-wrapper'));
          if (!wrappers.length) {
            return;
          }

          var viewport = track.closest('.orbit-viewport');
          if (!viewport) {
            return;
          }

          var TITLES = [
            "Lumenous",
            "Starlight Burst",
            "Captain Splash",
          ];
          var TITLE_IMAGES = [
            "./img/logo1.png",
            "img/logo2.png",
          ];

          var START_INDEX = 0; // Which card starts centered (0 = first card).
          var MAX_CARD_ROT = 16; // Maximum rotation (deg) applied away from center.
          var BASE_Y = -120; // Baseline vertical lift (px) at the reference card height.
          // var ARC_Y = 180; // Previous deeper arc (px) at the reference card height.
          var ARC_Y = 40; // Additional vertical drop (px) at the reference card height.
          var GAP = 110; // Fallback horizontal spacing (px) if CSS var is missing.
          var cardHeightRef = 320; // Reference card height (px) used for scaling.
          var INACTIVE_OPACITY = 0.4; // How dim inactive cards look (0-1).
          var DIM_SMOOTH = 0.18; // Seconds to smooth dimming transitions.
          var DIM_EASE = 'none'; // Keep dimming in sync with drag speed.
          var SUPPORT_SCALE_MIN = 0.7; // Support visual scale when not centered.
          var SUPPORT_SCALE_MAX = 1.15; // Support visual scale at center.
          var SUPPORT_X_MIN = 0; // Support visual offset X (px) when not centered.
          var SUPPORT_Y_MIN = 0; // Support visual offset Y (px) when not centered.
          var SUPPORT_X_MAX_DEFAULT = 0; // Default center pop X (px), overridden via CSS var.
          var SUPPORT_Y_MAX_DEFAULT = -28; // Default center pop Y (px), overridden via CSS var.
          var SUPPORT_OPACITY_MIN = 0; // Support visual opacity when not centered.
          var SUPPORT_OPACITY_MAX = 1; // Support visual opacity at center.
          var SUPPORT_EASE = 'power3.out'; // Easing curve for support visual focus.
          var SUPPORT_TWEEN_EASE = 'power1.out'; // Easing for support visual transitions.
          var SUPPORT_SMOOTH = 0.4; // Seconds to smooth support visual motion.

          var cardWidth = 0;
          var cardHeight = 0;
          var stepSize = 0;
          var orbitWrapper = track.closest('.card_dial_wrapper');
          measureDimensions();

          var cardBgs = [];
          var visuals = [];
          var supportVisuals = [];
          var supportTweenSetters = [];
          var supportPopXs = [];
          var supportPopYs = [];
          var supportTopBuffer = 0;
          var supportBottomBuffer = 0;
          var bgOpacitySetters = [];
          var visualOpacitySetters = [];
          var supportEase = gsap.parseEase(SUPPORT_EASE);
          wrappers.forEach(function (wrapper) {
            var bg = wrapper.querySelector('.orbit-card-bg');
            var visual = wrapper.querySelector('.orbit-card-visual');
            var supports = Array.prototype.slice.call(wrapper.querySelectorAll('.orbit-card-support-visual'));
            cardBgs.push(bg);
            visuals.push(visual);
            supportVisuals.push(supports);
            supportTweenSetters.push(supports.map(function (support) {
              if (!support) {
                return null;
              }
              return {
                x: gsap.quickTo(support, 'x', { duration: SUPPORT_SMOOTH, ease: SUPPORT_TWEEN_EASE }),
                y: gsap.quickTo(support, 'y', { duration: SUPPORT_SMOOTH, ease: SUPPORT_TWEEN_EASE }),
                scale: gsap.quickTo(support, 'scale', { duration: SUPPORT_SMOOTH, ease: SUPPORT_TWEEN_EASE }),
                opacity: gsap.quickTo(support, 'opacity', { duration: SUPPORT_SMOOTH, ease: SUPPORT_TWEEN_EASE })
              };
            }));
            bgOpacitySetters.push(bg ? gsap.quickTo(bg, 'opacity', { duration: DIM_SMOOTH, ease: DIM_EASE }) : null);
            visualOpacitySetters.push(visual ? gsap.quickTo(visual, 'opacity', { duration: DIM_SMOOTH, ease: DIM_EASE }) : null);
          });
          measureSupportOffsets();

          function measureDimensions() {
            var firstRect = wrappers[0].getBoundingClientRect();
            cardWidth = firstRect.width;
            cardHeight = firstRect.height;
            cardHeightRef = readCssNumber(document.documentElement, '--orbit-card-height', cardHeight);
            if (orbitWrapper) {
              GAP = readCssNumber(orbitWrapper, '--orbit-gap', GAP);
            }
            if (wrappers.length > 1) {
              var secondRect = wrappers[1].getBoundingClientRect();
              stepSize = secondRect.left - firstRect.left;
            } else {
              stepSize = cardWidth + GAP;
            }
          }

          function readCssNumber(element, name, fallback) {
            if (!element) {
              return fallback;
            }
            var value = getComputedStyle(element).getPropertyValue(name);
            if (!value) {
              return fallback;
            }
            var parsed = parseFloat(value);
            return Number.isFinite(parsed) ? parsed : fallback;
          }

          function measureSupportOffsets() {
            supportPopXs = [];
            supportPopYs = [];
            supportTopBuffer = 0;
            supportBottomBuffer = 0;
            supportVisuals.forEach(function (supports) {
              var xs = [];
              var ys = [];
              supports.forEach(function (support) {
                if (!support) {
                  return;
                }
                var popX = readCssNumber(support, '--support-pop-x', SUPPORT_X_MAX_DEFAULT);
                var popY = readCssNumber(support, '--support-pop-y', SUPPORT_Y_MAX_DEFAULT);
                xs.push(popX);
                ys.push(popY);

                var baseHeight = support.offsetHeight || 0;
                var scaleExtra = Math.max(0, SUPPORT_SCALE_MAX - 1) * baseHeight;
                if (popY < 0) {
                  supportTopBuffer = Math.max(supportTopBuffer, -popY);
                }
                var bottomOverflow = popY + scaleExtra;
                if (bottomOverflow > supportBottomBuffer) {
                  supportBottomBuffer = bottomOverflow;
                }
              });
              supportPopXs.push(xs);
              supportPopYs.push(ys);
            });
            supportBottomBuffer = Math.max(0, supportBottomBuffer);
          }

          function measureCurrentBounds() {
            var viewportRect = viewport.getBoundingClientRect();
            var minTop = viewportRect.top;
            var maxBottom = viewportRect.bottom;

            wrappers.forEach(function (wrapper) {
              var card = wrapper.querySelector('.orbit-card');
              if (!card) {
                return;
              }
              var rect = card.getBoundingClientRect();
              minTop = Math.min(minTop, rect.top);
              maxBottom = Math.max(maxBottom, rect.bottom);
            });

            return {
              minTop: minTop,
              maxBottom: maxBottom,
              viewportRect: viewportRect
            };
          }

          function getLayoutTop(element) {
            var top = 0;
            var node = element;
            while (node) {
              top += node.offsetTop || 0;
              node = node.offsetParent;
            }
            var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
            return top - scrollY;
          }

          function getLayoutBottom(element) {
            return getLayoutTop(element) + element.offsetHeight;
          }

          function updateOrbitClearance() {
            if (!orbitWrapper) {
              return;
            }
            orbitWrapper.style.setProperty('--orbit-overflow-top', '0px');
            orbitWrapper.style.setProperty('--orbit-overflow-bottom', '0px');
            var bounds = measureCurrentBounds();
            var viewportRect = bounds.viewportRect;
            var titleEl = orbitWrapper.querySelector('.orbit_hero_title');
            var workSection = orbitWrapper.closest('.work');
            var messageEl = workSection ? workSection.querySelector('.message_wrapper') : null;

            var titleGap = readCssNumber(orbitWrapper, '--orbit-title-gap', 0);
            var titleBuffer = readCssNumber(orbitWrapper, '--orbit-title-buffer', 0);
            var topAdjust = readCssNumber(orbitWrapper, '--orbit-overflow-top-adjust', 0);
            var messageGap = readCssNumber(orbitWrapper, '--orbit-message-gap', 0);
            var bottomAdjust = readCssNumber(orbitWrapper, '--orbit-overflow-bottom-adjust', 0);
            var bottomCap = readCssNumber(orbitWrapper, '--orbit-overflow-bottom-cap', NaN);
            var desiredTop = titleEl ? getLayoutBottom(titleEl) + titleGap + titleBuffer : viewportRect.top;
            var desiredBottom = messageEl ? getLayoutTop(messageEl) - messageGap : viewportRect.bottom;

            var overflowTop = Math.max(0, desiredTop - bounds.minTop + supportTopBuffer + topAdjust);
            var rawOverflowBottom = bounds.maxBottom + supportBottomBuffer - desiredBottom;
            var overflowBottom = rawOverflowBottom;

            if (rawOverflowBottom <= 0) {
              // Allow negative values to tighten spacing, but never beyond the actual extra space.
              overflowBottom = Math.max(rawOverflowBottom, bottomAdjust);
            } else {
              // Never reduce below the required clearance when overlap exists.
              overflowBottom = rawOverflowBottom + bottomAdjust;
              if (overflowBottom < rawOverflowBottom) {
                overflowBottom = rawOverflowBottom;
              }
            }

            if (Number.isFinite(bottomCap)) {
              overflowBottom = Math.min(overflowBottom, bottomCap);
            }

            orbitWrapper.style.setProperty('--orbit-overflow-top', Math.ceil(overflowTop) + 'px');
            orbitWrapper.style.setProperty('--orbit-overflow-bottom', Math.ceil(overflowBottom) + 'px');
          }

          var clearanceRAF = null;
          function scheduleClearance() {
            if (clearanceRAF) {
              cancelAnimationFrame(clearanceRAF);
            }
            clearanceRAF = requestAnimationFrame(function () {
              clearanceRAF = null;
              updateOrbitClearance();
            });
          }

          function step() {
            return stepSize || cardWidth + GAP;
          }

          function centerOffset() {
            return viewport.clientWidth / 2 - cardWidth / 2;
          }

          function scaledBaseY() {
            return BASE_Y * (cardHeight / cardHeightRef);
          }

          function scaledArcY() {
            return ARC_Y * (cardHeight / cardHeightRef);
          }

          var activeIndex = START_INDEX;
          var dragX = 0;
          var titleTween = null;

          function update(instant) {
            var setImmediate = !!instant;
            wrappers.forEach(function (wrapper, i) {
              var delta = (i - activeIndex) + dragX / step();
              var t = gsap.utils.clamp(-2.5, 2.5, delta);
              var absT = Math.abs(t);

              var curve = absT * absT;
              var y = scaledBaseY() + curve * scaledArcY();
              gsap.set(wrapper, { y: y });

              var rot = t < 0 ? -MAX_CARD_ROT * Math.min(1, absT) : t > 0 ? MAX_CARD_ROT * Math.min(1, absT) : 0;
              gsap.set(wrapper.querySelector('.orbit-card'), { rotation: rot });

              var cardBg = cardBgs[i];
              var visual = visuals[i];
              var supports = supportVisuals[i];
              var focus = 1 - gsap.utils.clamp(0, 1, absT);
              var visualScale = gsap.utils.interpolate(0.88, 1.18, focus);
              var dim = gsap.utils.interpolate(INACTIVE_OPACITY, 1, focus);
              if (cardBg) {
                var setBgOpacity = bgOpacitySetters[i];
                if (!setImmediate && setBgOpacity) {
                  setBgOpacity(dim);
                } else {
                  gsap.set(cardBg, { opacity: dim });
                }
              }
              if (visual) {
                var setVisualOpacity = visualOpacitySetters[i];
                if (!setImmediate && setVisualOpacity) {
                  setVisualOpacity(dim);
                } else {
                  gsap.set(visual, { opacity: dim });
                }
                gsap.set(visual, { scale: visualScale });
              }

              if (supports && supports.length) {
                var easedFocus = supportEase(focus);
                var supportScale = gsap.utils.interpolate(SUPPORT_SCALE_MIN, SUPPORT_SCALE_MAX, easedFocus);
                supports.forEach(function (support, supportIndex) {
                  var supportPopX = supportPopXs[i] && supportPopXs[i][supportIndex] !== undefined
                    ? supportPopXs[i][supportIndex]
                    : SUPPORT_X_MAX_DEFAULT;
                  var supportPopY = supportPopYs[i] && supportPopYs[i][supportIndex] !== undefined
                    ? supportPopYs[i][supportIndex]
                    : SUPPORT_Y_MAX_DEFAULT;
                  var supportX = gsap.utils.interpolate(SUPPORT_X_MIN, supportPopX, easedFocus);
                  var supportY = gsap.utils.interpolate(SUPPORT_Y_MIN, supportPopY, easedFocus);
                  var supportOpacity = gsap.utils.interpolate(SUPPORT_OPACITY_MIN, SUPPORT_OPACITY_MAX, easedFocus);
                  var setters = supportTweenSetters[i] && supportTweenSetters[i][supportIndex];
                  if (!setImmediate && setters) {
                    setters.scale(supportScale);
                    setters.x(supportX);
                    setters.y(supportY);
                    setters.opacity(supportOpacity);
                  } else {
                    gsap.set(support, { scale: supportScale, x: supportX, y: supportY, opacity: supportOpacity });
                  }
                });
              }
            });
          }

          function updateTitle(index) {
            var nextTitle = TITLES[index] || (titleTextEl ? titleTextEl.textContent : '');
            var nextImage = TITLE_IMAGES[index] || (titleImageEl ? titleImageEl.dataset.titleSrc || '' : '');
            var currentTitle = titleTextEl ? titleTextEl.textContent : '';
            var currentImage = titleImageEl ? titleImageEl.dataset.titleSrc || '' : '';
            if (currentTitle === nextTitle && (!titleImageEl || currentImage === nextImage)) {
              return;
            }

            if (titleTween) {
              titleTween.kill();
            }
            gsap.killTweensOf(titleEl);

            titleTween = gsap.timeline();
            titleTween.to(titleEl, {
              opacity: 0,
              y: -24,
              scale: 0.96,
              duration: 0.18,
              ease: 'power2.in'
            });
            titleTween.add(function () {
              if (titleTextEl) {
                titleTextEl.textContent = nextTitle;
              }
              if (titleImageEl && nextImage) {
                titleImageEl.dataset.titleSrc = nextImage;
                titleImageEl.src = nextImage;
                titleImageEl.alt = nextTitle;
              }
            });
            titleTween.add(scheduleClearance);
            titleTween.fromTo(
              titleEl,
              {
                opacity: 0,
                y: -48,
                scale: 1.02,
              },
              {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.52,
                ease: 'back.out(2.4)'
              }
            );
          }

          function centerIndexInstant(index) {
            activeIndex = index;
            dragX = 0;
            gsap.set(track, { x: centerOffset() - index * step() });
            updateTitle(index);
          }

          function centerIndex(index) {
            activeIndex = index;
            dragX = 0;
            updateTitle(index);

            gsap.to(track, {
              x: centerOffset() - index * step(),
              duration: 0.6,
              ease: 'power3.out',
              onUpdate: function () {
                dragX = gsap.getProperty(track, 'x') - (centerOffset() - index * step());
                update();
                scheduleClearance();
              }
            });
          }

          function snapToNearest() {
            var x = this ? this.x : gsap.getProperty(track, 'x');
            var raw = x - centerOffset();
            var index = Math.round(-raw / step());
            var clamped = gsap.utils.clamp(0, wrappers.length - 1, index);
            centerIndex(clamped);
          }

          requestAnimationFrame(function () {
            centerIndexInstant(START_INDEX);
            update();
            scheduleClearance();
          });

          Draggable.create(track, {
            type: 'x',
            inertia: true,
            zIndexBoost: false,
            bounds: {
              minX: -(wrappers.length - 1) * step(),
              maxX: centerOffset()
            },
            onDrag: function () {
              dragX = this.x - (centerOffset() - activeIndex * step());
              update();
              scheduleClearance();
            },
            onThrowUpdate: function () {
              dragX = this.x - (centerOffset() - activeIndex * step());
              update();
              scheduleClearance();
            },
            onRelease: snapToNearest,
            onThrowComplete: snapToNearest
          });

          function refreshLayout() {
            measureDimensions();
            measureSupportOffsets();
            gsap.killTweensOf(track);
            centerIndexInstant(activeIndex);
            update();
            scheduleClearance();

            var draggable = Draggable.get(track);
            if (draggable) {
              draggable.applyBounds({
                minX: -(wrappers.length - 1) * step(),
                maxX: centerOffset()
              });
            }
          }

          var resizeRAF = null;
          window.addEventListener('resize', function () {
            if (resizeRAF) {
              cancelAnimationFrame(resizeRAF);
            }
            resizeRAF = requestAnimationFrame(refreshLayout);
          });

          if (typeof ResizeObserver !== 'undefined') {
            var resizeObserver = new ResizeObserver(function () {
              if (resizeRAF) {
                cancelAnimationFrame(resizeRAF);
              }
              resizeRAF = requestAnimationFrame(refreshLayout);
            });
            resizeObserver.observe(track);
            resizeObserver.observe(wrappers[0]);
            resizeObserver.observe(viewport);
            var heroTitle = orbitWrapper ? orbitWrapper.querySelector('.orbit_hero_title') : null;
            if (heroTitle) {
              resizeObserver.observe(heroTitle);
            }
            var workSection = orbitWrapper ? orbitWrapper.closest('.work') : null;
            var messageEl = workSection ? workSection.querySelector('.message_wrapper') : null;
            if (messageEl) {
              resizeObserver.observe(messageEl);
            }
          }
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(scheduleClearance);
          }
          window.addEventListener('load', scheduleClearance, { once: true });
        })();
    //   </script>

        (function () {
          var workSection = document.getElementById('work');
          if (!workSection) {
            return;
          }

          function updateWorkHeightVar() {
            var height = workSection.getBoundingClientRect().height;
            workSection.style.setProperty('--work-height', height + 'px');
          }

          updateWorkHeightVar();

          if (typeof ResizeObserver !== 'undefined') {
            var workObserver = new ResizeObserver(function () {
              updateWorkHeightVar();
            });
            workObserver.observe(workSection);
          } else {
            window.addEventListener('resize', updateWorkHeightVar);
          }
        })();
