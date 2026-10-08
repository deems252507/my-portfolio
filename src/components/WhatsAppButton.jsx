import { useSiteContent } from "../context/SiteContentContext";

export default function WhatsAppButton() {
  const { content } = useSiteContent();

  const enabled = String(content.wa_enabled || "true") !== "false";
  const number = String(content.wa_number || "").replace(/\D/g, "");
  const text = content.wa_button_text || "Chat WhatsApp";
  const message = content.wa_message || "";

  if (!enabled || !number) return null;

  const href = `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={text}
      title={text}
      className="fixed bottom-5 right-5 z-[60] group flex items-center gap-2"
    >
      <span className="hidden sm:inline-block opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200 text-xs font-medium text-white bg-[#075e54] px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
        {text}
      </span>
      <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-[0_4px_20px_rgba(37,211,102,0.45)] hover:scale-110 active:scale-95 transition-transform duration-200">
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
        <svg
          viewBox="0 0 32 32"
          className="w-7 h-7 relative z-10"
          fill="white"
          aria-hidden="true"
        >
          <path d="M16.004 3C9.377 3 4 8.373 4 14.996c0 2.64.86 5.09 2.325 7.09L4.7 28.3l6.48-1.7A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 14.996 28 8.373 22.63 3 16.004 3zm0 21.9a9.86 9.86 0 0 1-5.02-1.37l-.36-.21-3.84 1.01 1.02-3.74-.23-.38a9.84 9.84 0 0 1-1.51-5.22c0-5.45 4.44-9.88 9.92-9.88 5.48 0 9.92 4.43 9.92 9.88 0 5.45-4.44 9.91-9.92 9.91zm5.43-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z" />
        </svg>
      </span>
    </a>
  );
}
