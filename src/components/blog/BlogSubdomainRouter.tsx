import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const BlogHome = lazy(() => import("@/pages/blog/BlogHome"));
const BlogPost = lazy(() => import("@/pages/blog/BlogPost"));
const BlogCategory = lazy(() => import("@/pages/blog/BlogCategory"));
const BlogTag = lazy(() => import("@/pages/blog/BlogTag"));
const BlogAuthor = lazy(() => import("@/pages/blog/BlogAuthor"));

/**
 * Detects the blogs.hustlaiapp.in subdomain and serves a dedicated editorial
 * router. Returns null on the main app domain so App.tsx routes run normally.
 */
export function isBlogHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "blogs.hustlaiapp.in" || h.startsWith("blogs.") || h === "blogs.localhost";
}

export function BlogSubdomainRouter() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /></div>}>
      <Routes>
        <Route path="/" element={<BlogHome />} />
        <Route path="/category/:slug" element={<BlogCategory />} />
        <Route path="/tag/:slug" element={<BlogTag />} />
        <Route path="/author/:slug" element={<BlogAuthor />} />
        <Route path="/blog" element={<Navigate to="/" replace />} />
        <Route path="/:slug" element={<BlogPost />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}