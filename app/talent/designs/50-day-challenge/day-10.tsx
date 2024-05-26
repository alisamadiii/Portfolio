"use client";

import IphoneSimulator from "@/components/iphone-simulator";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";

import { FaCamera } from "react-icons/fa";
import { IoIosFlashlight } from "react-icons/io";
import { IoArrowBackSharp } from "react-icons/io5";

export default function Day10() {
  const [images, setImages] = useState(["/my-image.jpg"]);
  const [capturedImageUrl, setCapturedImageUrl] = useState<null | string>(null);

  const [isCamera, setIsCamera] = useState(false);
  const [showImages, setShowImages] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onCameraClickHandler = () => setIsCamera(!isCamera);

  useEffect(() => {
    if (isCamera) {
      const video = document.querySelector("#videoElement") as HTMLVideoElement;

      if (video && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((stream) => {
            video.srcObject = stream;
          })
          .catch((error) => {
            console.log(error);
          });
      } else {
        console.log("it is not supported");
      }
    }
  }, [isCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (canvas) {
      const context = canvas.getContext("2d");

      if (video && context) {
        const size = Math.min(video.videoWidth, video.videoHeight);
        const offsetX = (video.videoWidth - size) / 2;
        const offsetY = (video.videoHeight - size) / 2;

        canvas.width = size;
        canvas.height = size;

        context.drawImage(
          video,
          offsetX,
          offsetY,
          size,
          size,
          0,
          0,
          size,
          size
        );

        canvas.toBlob(async (blob) => {
          if (blob) {
            const imageUrl = URL.createObjectURL(blob);
            setCapturedImageUrl(imageUrl);
          }
        }, "image/png");
      }
    }
  };

  useEffect(() => {
    if (capturedImageUrl) {
      const newImages = [...images];

      newImages.push(capturedImageUrl);

      setImages(newImages);

      setCapturedImageUrl(null);
    }
  }, [capturedImageUrl]);

  return (
    <div>
      <IphoneSimulator
        theme="light"
        elementColor="light"
        topElements={!isCamera}
        pillChildren={
          <div>
            <AnimatePresence>
              {isCamera && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-green-500"
                />
              )}
            </AnimatePresence>
          </div>
        }
      >
        <Image
          src={
            "https://media.idownloadblog.com/wp-content/uploads/2022/09/iPhone-14-Pro-Deep-Purple-wallpaper.png"
          }
          width={400}
          height={800}
          alt="wallpaper"
          className="absolute left-0 top-0 -z-10 w-96"
        />

        <div className="absolute bottom-12 flex w-full justify-between px-8">
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-2xl backdrop-blur-lg duration-200 active:scale-95">
            <IoIosFlashlight />
          </button>
          <motion.button
            layoutId="camera-wrapper"
            className="flex h-12 w-12 items-center justify-center bg-black/40 text-lg backdrop-blur-lg"
            onClick={onCameraClickHandler}
            whileTap={{ scale: 0.9 }}
            style={{ borderRadius: 48 }}
          >
            <motion.span layout>
              <FaCamera />
            </motion.span>
          </motion.button>
        </div>

        <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
          <AnimatePresence initial={false}>
            {isCamera && (
              <motion.div
                layoutId="camera-wrapper"
                className="absolute inset-0 flex flex-col items-center justify-between overflow-hidden bg-black px-4 py-14"
                style={{ borderRadius: 48 }}
              >
                <div className="flex h-20 w-full items-start justify-between">
                  <button onClick={onCameraClickHandler}>
                    <IoArrowBackSharp />
                  </button>
                  <div></div>
                </div>
                <div className="relative aspect-square w-full">
                  <motion.video
                    ref={videoRef}
                    autoPlay
                    id="videoElement"
                    className="h-full w-full object-cover"
                  />
                  <canvas ref={canvasRef} style={{ display: "none" }} />

                  {capturedImageUrl && (
                    <motion.img
                      layoutId={capturedImageUrl}
                      src={capturedImageUrl}
                      className="absolute left-0 top-0 z-10 aspect-square w-full"
                    />
                  )}
                </div>

                <div className="flex h-36 w-full flex-col items-center">
                  <div className="grow"></div>
                  <div className="grid w-full grid-cols-3 items-center">
                    <button
                      className="-space-y-6"
                      onClick={() => setShowImages(true)}
                    >
                      {images.slice(-2).map((image, index) => (
                        <motion.img
                          animate={{
                            scale: index === 0 ? 0.8 : 1,
                            opacity: index === 0 ? 0.5 : 1,
                          }}
                          key={image}
                          layoutId={image}
                          src={image}
                          width={40}
                          height={40}
                          alt=""
                          className="relative aspect-square w-8 rounded-md"
                        />
                      ))}
                    </button>
                    <button
                      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white duration-200 active:scale-95"
                      onClick={handleCapture}
                    >
                      <div className="h-14 w-14 rounded-full border-2 border-black bg-white"></div>
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showImages && (
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: "0%" }}
                      exit={{ y: "100%" }}
                      className="absolute bottom-0 left-0 z-30 flex h-full w-full bg-black/70 px-4 backdrop-blur-lg"
                      onClick={() => setShowImages(false)}
                    >
                      <div className="absolute left-0 top-0 h-12 w-full bg-gradient-to-t from-transparent to-black"></div>
                      <div className="absolute bottom-0 left-0 h-12 w-full bg-gradient-to-b from-transparent to-black"></div>
                      <div className="no-scrollbar overflow-auto">
                        <ul className="grid grid-cols-5 items-start gap-1 py-12">
                          {images.map((image) => (
                            <li key={image}>
                              <img
                                src={image}
                                className="aspect-square object-cover"
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </MotionConfig>
      </IphoneSimulator>
    </div>
  );
}
