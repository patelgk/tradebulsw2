import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_TAGLINE, BrandIconSVG } from './BrandLogo';

interface SplashScreenProps {
  /** Called once the splash animation fully exits */
  onFinished: () => void;
  /** How long to display before fading out (ms). Default: 2200 */
  duration?: number;
}

/**
 * SplashScreen
 *
 * Premium animated splash screen matching PropRupee brand:
 *   - Very dark green-black background (#050d05)
 *   - Neon-green radial glow behind the icon
 *   - BrandIconSVG (the R₹ monogram) fade-in + scale-up
 *   - Pulsing ring animation
 *   - "PropRupee" wordmark with green glow on "Rupee"
 *   - Tagline letter-spacing reveal
 *   - Green progress bar
 *   - Smooth fade-out before handing off to the app
 */
const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinished,
  duration = 2200,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  return (
    <AnimatePresence onExitComplete={onFinished}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
          style={{ background: '#050d05' }}
        >
          {/* ── Background radial glows ── */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 46%, rgba(34,197,94,0.16) 0%, transparent 52%),' +
                'radial-gradient(circle at 50% 46%, rgba(74,222,128,0.07) 0%, transparent 70%)',
            }}
          />

          {/* ── Expanding pulse ring ── */}
          <motion.div
            aria-hidden
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.6, 1.3, 1.1], opacity: [0, 0.4, 0] }}
            transition={{ duration: 1.8, delay: 0.25, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 240,
              height: 240,
              borderRadius: '50%',
              border: '2px solid rgba(34,197,94,0.55)',
              filter: 'blur(5px)',
            }}
          />

          {/* ── Second slower ring ── */}
          <motion.div
            aria-hidden
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.5, 1.6, 1.4], opacity: [0, 0.2, 0] }}
            transition={{ duration: 2.2, delay: 0.5, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 300,
              height: 300,
              borderRadius: '50%',
              border: '1.5px solid rgba(34,197,94,0.3)',
              filter: 'blur(4px)',
            }}
          />

          {/* ── Logo icon ── */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-5"
            initial={{ opacity: 0, scale: 0.65 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Icon with glow filter */}
            <motion.div
              initial={{ filter: 'drop-shadow(0 0 0px rgba(34,197,94,0))' }}
              animate={{
                filter: [
                  'drop-shadow(0 0 10px rgba(34,197,94,0.3))',
                  'drop-shadow(0 0 36px rgba(34,197,94,0.75))',
                  'drop-shadow(0 0 24px rgba(34,197,94,0.5))',
                ],
              }}
              transition={{ duration: 1.4, delay: 0.4, ease: 'easeOut' }}
            >
              <BrandIconSVG size={144} />
            </motion.div>

            {/* ── Wordmark ── */}
            <motion.div
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.6, ease: 'easeOut' }}
            >
              <span
                style={{
                  fontFamily: "'Arial Black', 'Arial', sans-serif",
                  fontWeight: 900,
                  fontSize: 32,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                <span style={{ color: '#ffffff', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
                  Prop
                </span>
                <span style={{
                  color: '#4ade80',
                  textShadow: '0 0 24px rgba(74,222,128,0.65), 0 0 8px rgba(74,222,128,0.4)',
                }}>
                  Rupee
                </span>
              </span>

              {/* ── Tagline with letter-spacing reveal ── */}
              <motion.span
                initial={{ opacity: 0, letterSpacing: '0.05em' }}
                animate={{ opacity: 1, letterSpacing: '0.22em' }}
                transition={{ duration: 0.75, delay: 0.8, ease: 'easeOut' }}
                style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: 'Arial, sans-serif',
                  textTransform: 'uppercase',
                  color: 'rgba(167,243,208,0.65)',
                }}
              >
                {APP_TAGLINE}
              </motion.span>
            </motion.div>
          </motion.div>

          {/* ── Progress bar at bottom ── */}
          <motion.div
            aria-hidden
            className="absolute bottom-10 w-32 overflow-hidden rounded-full"
            style={{ height: 2, background: 'rgba(255,255,255,0.08)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            <motion.div
              style={{
                height: '100%',
                borderRadius: 9999,
                background: 'linear-gradient(90deg, #16a34a, #4ade80)',
                boxShadow: '0 0 10px rgba(74,222,128,0.8)',
              }}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{
                duration: (duration / 1000) - 0.35,
                delay: 0.65,
                ease: 'linear',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
