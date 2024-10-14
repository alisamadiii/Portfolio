import React from "react";

import * as Element from "@/components/TwitterContentsElement";

const blockElements = [
  {
    name: "address",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/address",
  },
  {
    name: "article",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article",
  },
  {
    name: "aside",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/aside",
  },
  {
    name: "blockquote",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote",
  },
  {
    name: "canvas",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas",
  },
  {
    name: "dd",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dd",
  },
  {
    name: "div",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div",
  },
  {
    name: "dl",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl",
  },
  {
    name: "dt",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dt",
  },
  {
    name: "fieldset",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset",
  },
  {
    name: "figcaption",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption",
  },
  {
    name: "figure",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure",
  },
  {
    name: "footer",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/footer",
  },
  {
    name: "form",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form",
  },
  {
    name: "h1",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements",
  },
  {
    name: "h2",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements",
  },
  {
    name: "h3",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements",
  },
  {
    name: "h4",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements",
  },
  {
    name: "h5",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements",
  },
  {
    name: "h6",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements",
  },
  {
    name: "header",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/header",
  },
  {
    name: "hr",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr",
  },
  {
    name: "li",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/li",
  },
  {
    name: "main",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/main",
  },
  {
    name: "nav",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav",
  },
  {
    name: "noscript",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noscript",
  },
  {
    name: "ol",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol",
  },
  {
    name: "p",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/p",
  },
  {
    name: "pre",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/pre",
  },
  {
    name: "section",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/section",
  },
  {
    name: "table",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table",
  },
  {
    name: "tfoot",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tfoot",
  },
  {
    name: "ul",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ul",
  },
  {
    name: "video",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video",
  },
];

// Example usage of block elements
const BlockElementsExample = () => (
  <>
    <address>Address</address>
    <article>Article</article>
    <aside>Aside</aside>
    <blockquote>Blockquote</blockquote>
    <canvas>Canvas</canvas>
    <dd>Description Details</dd>
    <div>Div</div>
    <dl>Description List</dl>
    <dt>Description Term</dt>
    <fieldset>Fieldset</fieldset>
    <figcaption>Figcaption</figcaption>
    <figure>Figure</figure>
    <footer>Footer</footer>
    <form>Form</form>
    <h1>Heading 1</h1>
    <h2>Heading 2</h2>
    <h3>Heading 3</h3>
    <h4>Heading 4</h4>
    <h5>Heading 5</h5>
    <h6>Heading 6</h6>
    <header>Header</header>
    <hr />
    <li>List Item</li>
    <main>Main</main>
    <nav>Nav</nav>
    <noscript>Noscript</noscript>
    <ol>Ordered List</ol>
    <p>Paragraph</p>
    <pre>Preformatted Text</pre>
    <section>Section</section>
    <table>Table</table>
    <tfoot>Table Footer</tfoot>
    <ul>Unordered List</ul>
    <video>Video</video>
  </>
);

export default function BlockElements() {
  return (
    <Element.Wrapper>
      <Element.Preview className="min-h-0">
        <div className="flex flex-wrap gap-4">
          {blockElements.map((element) => (
            <div key={element.name}>
              <a
                href={element.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {element.name}
              </a>
            </div>
          ))}
        </div>
      </Element.Preview>
    </Element.Wrapper>
  );
}
