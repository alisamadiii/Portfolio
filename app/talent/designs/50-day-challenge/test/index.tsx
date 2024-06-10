"use client";
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import useMeasure from "react-use-measure";

export default function MultiStepComponent() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<number | undefined>();
  const [ref, bounds] = useMeasure();

  const content = useMemo(() => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <h2 className="heading">This is step one</h2>
            <p>
              Usually in this step we would explain why this thing exists and
              what it does. Also, we would show a button to go to the next step.
            </p>
            <div className="skeletons">
              <div className="skeleton" style={{ width: 256 }} />
              <div className="skeleton" style={{ width: 192 }} />
              <div className="skeleton" />
              <div className="skeleton" style={{ width: 384 }} />
            </div>
          </>
        );
      case 1:
        return (
          <>
            <h2 className="heading">This is step two</h2>
            <p>
              Usually in this step we would explain why this thing exists and
              what it does. Also, we would show a button to go to the next step.
            </p>
            <div className="skeletons">
              <div className="skeleton" style={{ width: 256 }} />
              <div className="skeleton" style={{ width: 192 }} />
              <div className="skeleton" style={{ width: 384 }} />
            </div>
          </>
        );
      case 2:
        return (
          <>
            <h2 className="heading">This is step three</h2>
            <p>
              Usually in this step we would explain why this thing exists and
              what it does. Also, we would show a button to go to the next step.
            </p>
            <div className="skeletons">
              <div className="skeleton" style={{ width: 256 }} />
              <div className="skeleton" style={{ width: 192 }} />
              <div className="skeleton" style={{ width: 128 }} />
              <div className="skeleton" style={{ width: 224 }} />
              <div className="skeleton" style={{ width: 384 }} />
            </div>
          </>
        );
    }
  }, [currentStep]);

  const onContinue = () => {
    if (currentStep === 2) {
      return;
    }

    setDirection(1);
    setCurrentStep(currentStep + 1);
  };

  const onBack = () => {
    if (currentStep === 0) {
      return;
    }

    setDirection(-1);
    setCurrentStep(currentStep - 1);
  };

  useEffect(() => {
    function keydownHandler(event: any) {
      if (event.key === "ArrowRight") {
        onContinue();
      } else if (event.key === "ArrowLeft") {
        onBack();
      }
    }

    window.addEventListener("keydown", keydownHandler);

    return () => {
      window.removeEventListener("keydown", keydownHandler);
    };
  }, [currentStep]);

  console.log("testing");

  return (
    <MotionConfig transition={{ duration: 2, type: "spring", bounce: 0 }}>
      <motion.div
        animate={{ height: bounds.height }}
        className="multi-step-wrapper"
      >
        <div className="multi-step-inner" ref={ref}>
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={currentStep}
              variants={variants}
              initial="initial"
              animate="active"
              exit="exit"
              custom={direction}
            >
              {content}
            </motion.div>
          </AnimatePresence>
          <motion.div layout className="actions">
            <button
              className="secondary-button"
              disabled={currentStep === 0}
              onClick={onBack}
            >
              Back
            </button>
            <button
              className="primary-button"
              disabled={currentStep === 2}
              onClick={onContinue}
            >
              Continue
            </button>
          </motion.div>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

const variants = {
  initial: (direction: number) => {
    return { x: `${110 * direction}%`, opacity: 0 };
  },
  active: { x: "0%", opacity: 1 },
  exit: (direction: number) => {
    return { x: `${-110 * direction}%`, opacity: 0 };
  },
};
