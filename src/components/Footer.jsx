import { useSiteContent } from "../context/SiteContentContext";

const Footer = () => {
  const { content } = useSiteContent();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full" style={{ background: "transparent" }}>
      <div className="max-w-6xl mx-auto px-4">
        <hr
          className="my-3 sm:mx-auto lg:my-6 opacity-40"
          style={{ borderColor: "var(--col-border)" }}
        />
        <p
          className="block text-sm pb-6 text-center"
          style={{ color: "var(--col-muted)" }}
        >
          © {currentYear}{" "}
          <a
            href="#Home"
            className="hover:underline transition-colors"
            style={{ color: "var(--col-white)" }}
          >
            {content.footer_brand}
          </a>
          <span style={{ color: "var(--col-muted)" }}>. All Rights Reserved.</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
