import React from "react";
import Button from "../components/Button";

const Contact = () => {
  return (
    <div className="flex flex-col justify-center items-center gap-12 py-24 px-4">
      <Button />
      <h4 className="text-2xl md:text-3xl lg:text-4xl text-center">
        Want me building stuff for you? Hit me on{" "}
        <a
          id="linkedIn"
          href="#"
          className="inline-block bg-linkedIn px-4 py-2 rounded-lg">
          LinkedIn
        </a>
      </h4>
    </div>
  );
};

export default Contact;
