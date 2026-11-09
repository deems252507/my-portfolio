import React, { useRef } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * TextEffect (motion-primitives) — port JSX dari prompt. Teks dipecah per kata / huruf / baris
 * lalu dianimasikan bertahap (stagger).
 *
 * Tambahan dibanding aslinya:
 *  - `inView`: animasi baru mulai saat teks masuk layar (sekali), cocok untuk paragraf di bawah fold;
 *  - `style` / `lang`: diteruskan ke elemen pembungkus (dipakai untuk rata kanan-kiri & potong baris);
 *  - spasi antar kata ditulis sebagai teks biasa (bukan <span inline-block>) supaya
 *    `text-align: justify` tetap bisa merapikan kanan-kiri;
 *  - `prefers-reduced-motion`: teks tampil langsung tanpa animasi.
 */
const defaultStaggerTimes = { char: 0.03, word: 0.05, line: 0.1 };

const defaultContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  exit: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
};
const defaultItemVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const presetVariants = {
  blur: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: "blur(12px)" },
      visible: { opacity: 1, filter: "blur(0px)" },
      exit: { opacity: 0, filter: "blur(12px)" },
    },
  },
  shake: {
    container: defaultContainerVariants,
    item: {
      hidden: { x: 0 },
      visible: { x: [-5, 5, -5, 5, 0], transition: { duration: 0.5 } },
      exit: { x: 0 },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0 },
      visible: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0 },
    },
  },
  fade: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
  },
};

const AnimationComponent = React.memo(({ segment, variants, per, segmentWrapperClassName }) => {
  // spasi/newline antar kata: teks biasa (agar justify & pre-line tetap bekerja)
  if (per === "word" && /^\s+$/.test(segment)) return segment;

  const content =
    per === "line" ? (
      <motion.span variants={variants} className="block">{segment}</motion.span>
    ) : per === "word" ? (
      <motion.span aria-hidden="true" variants={variants} className="inline-block">{segment}</motion.span>
    ) : (
      <motion.span className="inline-block whitespace-pre">
        {segment.split("").map((char, i) => (
          <motion.span key={`char-${i}`} aria-hidden="true" variants={variants} className="inline-block whitespace-pre">{char}</motion.span>
        ))}
      </motion.span>
    );

  if (!segmentWrapperClassName) return content;
  const defaultWrapperClassName = per === "line" ? "block" : "inline-block";
  return <span className={cn(defaultWrapperClassName, segmentWrapperClassName)}>{content}</span>;
});
AnimationComponent.displayName = "AnimationComponent";

export function TextEffect({
  children,
  per = "word",
  as = "p",
  variants,
  className,
  style,
  lang,
  preset,
  delay = 0,
  trigger = true,
  inView = false,
  onAnimationComplete,
  segmentWrapperClassName,
}) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.15 });
  const reduce = useReducedMotion();
  const text = typeof children === "string" ? children : String(children ?? "");

  if (reduce) {
    const Tag = as;
    return <Tag className={cn("whitespace-pre-wrap", className)} style={style} lang={lang}>{text}</Tag>;
  }

  let segments;
  if (per === "line") segments = text.split("\n");
  else if (per === "word") segments = text.split(/(\s+)/);
  else segments = text.split("");

  const MotionTag = motion[as];
  const selected = preset ? presetVariants[preset] : { container: defaultContainerVariants, item: defaultItemVariants };
  const containerVariants = variants?.container || selected.container;
  const itemVariants = variants?.item || selected.item;
  const ariaLabel = per === "line" ? undefined : text;
  const stagger = defaultStaggerTimes[per];
  const active = trigger && (!inView || seen);

  const delayedContainerVariants = {
    hidden: containerVariants.hidden,
    visible: {
      ...containerVariants.visible,
      transition: {
        ...containerVariants.visible?.transition,
        staggerChildren: containerVariants.visible?.transition?.staggerChildren || stagger,
        delayChildren: delay,
      },
    },
    exit: containerVariants.exit,
  };

  return (
    <AnimatePresence>
      {trigger && (
        <MotionTag
          ref={ref}
          initial="hidden"
          animate={active ? "visible" : "hidden"}
          exit="exit"
          aria-label={ariaLabel}
          lang={lang}
          style={style}
          variants={delayedContainerVariants}
          className={cn("whitespace-pre-wrap", className)}
          onAnimationComplete={onAnimationComplete}
        >
          {segments.map((segment, index) => (
            <AnimationComponent
              key={`${per}-${index}-${segment}`}
              segment={segment}
              variants={itemVariants}
              per={per}
              segmentWrapperClassName={segmentWrapperClassName}
            />
          ))}
        </MotionTag>
      )}
    </AnimatePresence>
  );
}

export default TextEffect;
