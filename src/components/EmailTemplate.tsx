import React from "react";

interface EmailTemplateProps {
  firstName: string;
  email: string;
  description: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  firstName,
  email,
  description,
}) => (
  <div>
    <p>
      Hey Ali, you have got a new email from someone that is trying to hire you.
    </p>

    <h1>A message from {firstName}:</h1>

    <p>{description}</p>

    <ul>
      <li>Name: {firstName}</li>
      <li>Email: {email}</li>
    </ul>
  </div>
);
