import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CONTENT,
  fetchSiteContent,
  readCachedContent,
  writeCachedContent,
  applyTheme,
} from "../lib/siteContent";

const SiteContentContext = createContext({
  content: DEFAULT_CONTENT,
  ready: false,
});

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState(() => {
    const cached = readCachedContent();
    applyTheme(cached);
    return cached;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetchSiteContent()
      .then((next) => {
        if (!active) return;
        setContent(next);
        writeCachedContent(next);
        applyTheme(next);
      })
      .catch(() => {
        /* tabel belum ada: tetap pakai teks bawaan */
        applyTheme(content);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-apply theme whenever content changes (e.g. admin save)
  useEffect(() => {
    applyTheme(content);
  }, [content]);

  const value = useMemo(() => ({ content, setContent, ready }), [content, ready]);
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  return useContext(SiteContentContext);
}
