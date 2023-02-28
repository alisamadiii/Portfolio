import React from "react";
import { motion } from "framer-motion";

function Button() {
  return (
    <motion.div
      animate={{ opacity: [0, 1], y: [30, 0] }}
      transition={{ duration: 1.09 }}
      className={`self-start md:self-center text-sm md:text-lg px-12 py-2 rounded-md border-2 border-light hover:border-dark hover:bg-gradient-to-br from-primary to-secondary`}>
      Contact Me
    </motion.div>
  );
}

export default Button;
