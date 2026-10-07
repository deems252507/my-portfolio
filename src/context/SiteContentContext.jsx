import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CONTENT,
  fetchSiteContent,
  readCachedContent,
  writeCachedContent,
} from "../lib/siteContent";

const SiteContentContext = createContext({
  content: DEFAULT_CONTENT,
  ready: false,
});

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState(readCachedContent);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetchSiteContent()
      .then((next) => {
        if (!active) return;
        setContent(next);
        writeCachedContent(next);
      })
      .catch(() => {
        /* tabel belum ada: tetap pakai teks bawaan */
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ content, setContent, ready }), [content, ready]);
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  return useContext(SiteContentContext);
}
