import React from "react";
import Button from "../components/Button";

const Contact = () => {
  return (
    <div
      id="contact"
      className="flex flex-col justify-center items-center gap-12 py-24 px-4">
      <a href="mailto:webdeve1083@gmail.com">
        <Button />
      </a>
      <h4 className="text-2xl md:text-3xl lg:text-4xl text-center">
        Want me building stuff for you? Hit me on{" "}
        <a
          id="linkedIn"
          href="https://www.linkedin.com/in/alireza17/"
          target={"_blank"}
          className="inline-block bg-linkedIn px-4 py-2 rounded-lg"
          rel="noreferrer">
          LinkedIn
        </a>
      </h4>
      <h4 className="text-light text-opacity-70">webdeve1083@gmail.com</h4>
    </div>
  );
};

export default Contact;
