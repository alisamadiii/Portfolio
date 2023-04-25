export const DAILY_APPLICATIONS = [
  {
    app: 1,
    name: "Chrome",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Google_Chrome_icon_%28February_2022%29.svg/800px-Google_Chrome_icon_%28February_2022%29.svg.png",
    useCase: ["Studing", "Developing"],
  },
  {
    app: 2,
    name: "VS Code",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/2048px-Visual_Studio_Code_1.35_icon.svg.png",
    useCase: ["Writing Codes"],
  },
  {
    app: 3,
    name: "Notion",
    img: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
    useCase: ["Keeping track of my Goals", "Making Template"],
  },
  {
    app: 4,
    name: "Figma",
    img: "https://miro.medium.com/v2/resize:fit:320/1*j3GPPrDmy2CqnxPw-NtWHg.png",
    useCase: ["Making Wireframes", "Designing Website + Images"],
  },
  {
    app: 5,
    name: "Twitter",
    img: "https://static.vecteezy.com/system/resources/previews/002/534/045/original/social-media-twitter-logo-blue-isolated-free-vector.jpg",
    useCase: ["Sharing my Journey", "Sharing Animated Contents"],
  },
  {
    app: 6,
    name: "PowerPoint",
    img: "https://1000logos.net/wp-content/uploads/2020/08/Microsoft-PowerPoint-Logo.png",
    useCase: ["Making Animated Contents"],
  },
  {
    app: 7,
    name: "Word",
    img: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACoCAMAAABt9SM9AAABDlBMVEX///8Ap/EAPZUAWsEAfdcAYsUAYMQAXcMAZMYAULkAVb0AZscASrQAUroAV74AKmoAMZEzsPKap8oALncAGEEAUK4AcMEAnusAf9gAldkAoOgARrIATb0AMW/M3fPM1+4AN3sARXwAdNUATokAKo4AhtHM0uPM6PsAEzff8Pzt8voANoXf4+4AV7EARKOpuuAAIFQAQrYAS74BjdQAQaEAPbO2yOjp7viWsN99ndfd5fS0xOUAACwABV4AD2x8xvXT6vuY0PcAhsFrl9cAXKkAWoYAdKwAXpQAmOpIg9AAU6QAV5hahs9CecuQrN1XhM81bcZ5l9MANbUAHUwAAB8AHItBX6QRQ5dWb6uPnsUSwZNoAAAIm0lEQVR4nO3bC3fTNhQH8IBXu1Jj8yrrtggyRgbFjAUbmle3sbUwVpa26Rhs+/5fZPLjypJtGisxx821/ufsnGI7O+7vXF1LctrpmJhsfB6/utVYXj1u+rfXin9r71qD2bv2pGmB6nnSKFXM9WvTBpXTNBXPXtMGVfNb44XF86pphYpp2inOhpSWfxUK69reZvT45tt7lL3NmD8YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI0YLI082ftGO+3FevH1CjFYOqm5unBj1ax1JbBm/WUZfV85L46OjjJaZFj+MbUca0mcLfvyOFJev3nz5vfPUVqNY43o1s7ybEvZKkmO7i3nOqq/tJrG6pP1qUoKLdLCh+VoUZUVVekAfcax3r6Isldj/mgWa7gcS28AQgt7+ODBg9df8nxRY7673yjWyXa9zUrkHcf6ExmW/RmqKhmHHOshMiyr7mbVVqx1rFqGtWqzaiHWelJ8Pt8erLUGYGzVHqw1reL1YUuw1mxW6WK6FVhrN6v2YK1ZVdJGDX6sOppVS7CWlFX1qkKLtV2xqpZR5axwYslUWzQK4bHzVEzEySFZyeEwZG3BSqxOO36aE1XLXogz/omqZR2LU6wVWDD8qDh8Zikj0Jpmn5hQBYsO4cSM2fixsl5Fxb30qdKs6Cj7xH2iYJE+nJhQ9JUlPwKtCRz2mdLY2Vj6CFOwQh+Oz602YW05c3HctuWHoCN/5FRqWlxFHJdblmVhxPLk+YKdNa25I00XeBOXkjUtrkKF74xJVKix0jFHZnB8YklTq6yJR+mTzMpxxcgdEokKMxY0KE+o9OVnHpspn2HSJJSJ/n5MZSu8WOLJ52TjTW7jTP1M1LTSKrKZ6O+OJVHhxLKUtY1tixM7WRt3zpND4HLmQXOyHQ+uHzOZCieWpy5riJgjHFtZy0r70mF6qp+28qj1n8P1I6J+EwcjFlWxstnnMGtaMO8UYzRMqWzHPYNjU2q1DcsR65oZKbSsU+jzC8tJWzwTuDueinUXP5a9I86IDu8s4AjInFF4GoYwbP1QofK8FmBtZU+3BXR4L602P4Cy4zOttMOL52SfKVTtwMqa1hQ6PEkP9dkpnIPJuieOnBGFCjtWshi0RMc+hA4PxTYkIZxbpGtmKq4+9VQrihkLNvscUSuztGk5MPeaUzFdn6azdSLqMFSoPIoaK2ta4hTLraKpAxOuzigdh2IdlLYsQdUOLGkzL92KgVX0OMymoH6YLAPFuJyQbAAmQYolbbdL0/VoVaOsokf8ESjKbseK1jZZfz+nOSucWPKbibhFncCpUTwtFUBTTxp2yXydiCksk0dgFBc5Vn6LYRw1LceDoRc9AQls4YziHsVgtTgLVSrq4sYq2byiyu5e1KY82BdNJuzi0iGTpTiVhPVVjbkaWNLmVbYtOvek3b1kq0GU3XY0rxL9fU6Uqoqx7t279+0znmXfHdeJ1e80mQRLsrItsas+caPVn/wPqWm5vKPDorHjUk+lcmmMdZen5K+mVg5rHstW4oi3FlExWfDAO493/JSmRS7Sf4yDXFmhxSpEVI8f8kEJC5pkGkrlpsVA7jDMUfH82A4sCs+4Dl/qwBx1lu4au3DO8awQVC9YnirtWciw3CJW9pbw2HNCsYpOdo3FBtYF8QK4znbzVDgrq4jlWOIl85BY2+mPx+muMYGyO2QUNgr9g6JVK7Di7U/YALzPKPRwO92CcbOmLvr7KCxQuQQ/VrqXkG28QCGJXWPPgnNU9PcpK1qhxCJFK8cTS74FtKiR2DUWZXd8AHe+IAUq9Fjw4tR2xFuLC5iSZrvGouyGf8FVBwUp7FiCiv8oqmcIU1Kxa+yJTtUPxA8lVpixnMxK/rbHCAZk2rKi5fJWesiHxc6ElVghxpLLSn4PMUt7uLxrHEDZQYmdkiIVXqwclbQgHKc3J+8ah9C0YMYVFKXQYhWopK2GTvownLvZTiibqudmQZkVTiylWUHyN0WkTWOyUM8Ne2VWKLFYsayinZiJctFY2TU+UP8P825RCjFWnsqx6Lly0aGyaxyqd8xKpEi3ixOrSBXdlXLRhbxrTNmZfI6vEUuoCFqsApX0KiLONpWsck3rsIjVjf7DiEWcMiuLKF/mDqgcV2laF70SKqTDkJRRWVb2twA8/VCmct1AvmWvhIpbocRiZVTRElC65oyp7yOY9Kz0D3LNKpZCj6XeFpkMRRZEfR9BFofi3LSXK6tutwVYudvysj9dZTkrrhWGPZ4gCHq93AjstgArT6V+c6H47oaQ/ERUNCvsWKVU3mVUJTMrhQonFvkUlZ5VTgorVv5+lo3AolRJWSHFYurdVGhWZVWVl2oD1tIBWLQqrao2YJVYLaEqa1ZJei9RY63SrD5RVdwKNdaKj8Byq14Pc2Wt2qw+UVVoh6FXxUpjBCZUSIehV3OzSqhwYlm0jrVNvqyQYs1JbTMrmarXe4oQaxReNrNabQTGuYEQqyN29qo3q/KyUqh6T3ef8zzluV5jBo+axfIZqVxWy6YLWV7uv+dWN7BhdfxFQNxlVN3qzSrK9f1dnFi8b81pkM9BLkH64pl1pf1mBlZKutef7+/GoxAjVpX88Pd+9ezuxoXVXqyfdrUSWxksDSuDVSHvE6oYq06rjcH6+cYKMVhaWLVaoca6U7MVaqy6rTYG65c72qndCjNW7VaIseq3QotV/xjcIKzB5/jldWOwNGKwNGKwNGKwNGKwNGKwNGKwNGKwNGKwNGKwNGKwNGKwNGKwNGKwNGKwNGKwNGKwNLIhWJ0PTUNF+TBefqNXIR+bhoryT9MKFfPoCozDwXD5fV6N/HuzaaubH5s2qJ6PDdfW4F3TAjq5PRjcbCyDwX9N//6aeXS7sWzIpMHExOTy/A8W4tY/KnZExQAAAABJRU5ErkJggg==",
    useCase: ["Designing Book"],
  },
  {
    app: 8,
    name: "Postman",
    img: "https://cdn.worldvectorlogo.com/logos/postman.svg",
    useCase: ["Testing API Calls"],
  },
  {
    app: 9,
    name: "Discord",
    img: "https://www.freepnglogos.com/uploads/discord-logo-png/discord-logo-logodownload-download-logotipos-1.png",
    useCase: ["Engaging with Developers", "Staff Member"],
  },
  {
    app: 9,
    name: "CapCut",
    img: "https://freelogopng.com/images/all_img/1664284918capcut-icon-png.png",
    useCase: ["Making Simple Videos"],
  },
  {
    app: 9,
    name: "YouTube",
    img: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png",
    useCase: ["Walking Series, Tutorials & Speechs"],
  },
];
