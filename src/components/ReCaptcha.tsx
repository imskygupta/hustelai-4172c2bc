import { useEffect, useRef, useState } from "react";

const SITE_KEY = "6LdBwIMsAAAAAL46tTt1fsxLIR7GXfMsnoTYHlou";

interface Props {
  onVerify: (token: string) => void;
}

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad: () => void;
  }
}

export function ReCaptcha({ onVerify }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const widgetRef = useRef<number | null>(null);

  useEffect(() => {
    // Load script if not already
    if (!document.querySelector('script[src*="recaptcha"]')) {
      window.onRecaptchaLoad = () => setLoaded(true);
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else if (window.grecaptcha?.render) {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded && containerRef.current && widgetRef.current === null) {
      try {
        widgetRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => onVerify(token),
          theme: "dark",
          size: "normal",
        });
      } catch (e) {
        // already rendered
      }
    }
  }, [loaded, onVerify]);

  return <div ref={containerRef} className="flex justify-center" />;
}
