import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate(); // Correctly initialize useNavigate here
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <div className="relative">
          <div className="flex justify-center items-center gap-4">
            <span className="text-8xl font-bold text-[#22A6DF]">4</span>
            <div className="relative">
              {/* Main circle with shadow effect */}
              <motion.div
                animate={{
                  rotate: -360,
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-32 h-32 bg-[#22A6DF] rounded-full relative"
                style={{
                  boxShadow:
                    "inset -4px -4px 8px rgba(0,0,0,0.2), inset 4px 4px 8px rgba(255,255,255,0.2)",
                }}
              >
                {/* Decorative dots on the circle */}
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-white rounded-full"
                    style={{
                      top: "50%",
                      left: "50%",
                      transform: `rotate(${i * 30}deg) translate(48px, -50%)`,
                    }}
                  />
                ))}
              </motion.div>

              {/* Cat running on top */}
              <div className="absolute top-0 left-0 w-full h-full">
                {/* Cat character */}
                <motion.div
                  className="absolute left-1/2 -top-4"
                  style={{
                    translateX: "-50%",
                  }}
                  animate={{
                    scaleX: [-1, -1, 1, 1], // Flip the cat based on position
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    times: [0, 0.5, 0.5, 1],
                  }}
                >
                  <div className="relative w-12 h-8">
                    {/* Cat body */}
                    <div className="w-8 h-6 bg-[#7fcbec] rounded-full absolute bottom-0 left-1/2 transform -translate-x-1/2">
                      {/* Cat head */}
                      <div className="w-6 h-6 bg-[#7fcbec] rounded-full absolute -top-2 -left-1">
                        {/* Cat ears - Pointy style */}
                        <div
                          className="absolute -top-3 left-1"
                          style={{
                            width: "0",
                            height: "0",
                            borderLeft: "4px solid transparent",
                            borderRight: "4px solid transparent",
                            borderBottom: "12px solid #4ab7e6",
                            transform: "rotate(-15deg)",
                          }}
                        ></div>
                        <div
                          className="absolute -top-3 right-1"
                          style={{
                            width: "0",
                            height: "0",
                            borderLeft: "4px solid transparent",
                            borderRight: "4px solid transparent",
                            borderBottom: "12px solid #4ab7e6",
                            transform: "rotate(15deg)",
                          }}
                        ></div>
                        {/* Cat face */}
                        <div className="w-1 h-1 bg-black rounded-full absolute top-2 left-1"></div>
                        <div className="w-1 h-1 bg-black rounded-full absolute top-2 right-1"></div>
                        <div className="w-1 h-1 bg-pink-400 rounded-full absolute top-3 left-2"></div>
                      </div>
                      {/* Cat tail */}
                      <motion.div
                        animate={{
                          rotateZ: [-10, 10, -10],
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                        }}
                        className="w-4 h-1.5 bg-[#7fcbec] absolute -right-3 top-2 rounded-full origin-left"
                      ></motion.div>
                      {/* Cat legs with running animation */}
                      <motion.div
                        animate={{
                          rotateZ: [-30, 30, -30],
                        }}
                        transition={{
                          duration: 0.3,
                          repeat: Infinity,
                        }}
                        className="w-1.5 h-3 bg-[#7fcbec] absolute bottom-0 left-1 rounded-full"
                      ></motion.div>
                      <motion.div
                        animate={{
                          rotateZ: [30, -30, 30],
                        }}
                        transition={{
                          duration: 0.3,
                          repeat: Infinity,
                        }}
                        className="w-1.5 h-3 bg-[#7fcbec] absolute bottom-0 right-1 rounded-full"
                      ></motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
            <span className="text-8xl font-bold text-[#22A6DF]">4</span>
          </div>
        </div>

        <h1 className="mt-8 text-2xl font-semibold text-gray-800">
          "Meow! Trang này đang bận chơi với mèo rồi!"
        </h1>
        <p className="mt-4 text-gray-600 max-w-md mx-auto">
          Oops! Có vẻ như trang bạn tìm đã bị lũ mèo nghịch ngợm giấu mất.
          <br />
          Quay lại cửa hàng để chọn đồ chơi cho boss mèo nhà bạn nhé!
        </p>

        <button
          onClick={() => navigate("/")} // Use navigate to go to the home page
          className="mt-8 px-6 py-3 bg-[#22A6DF] text-white rounded-lg hover:bg-[#4ab7e6] transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          Về cửa hàng
        </button>
      </div>
    </div>
  );
};

export default NotFound;
