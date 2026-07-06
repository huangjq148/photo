import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeActions } from "@/components/home/home-actions";
import { getAuthenticatedRedirectPath } from "@/lib/auth/redirects";

describe("auth navigation", () => {
  it("shows 进入相册 CTA for authenticated users on home", () => {
    const html = renderToStaticMarkup(createElement(HomeActions, { isAuthenticated: true }));

    expect(html).not.toContain('href="/login"');
    expect(html).toContain('href="/albums"');
    expect(html).toContain("进入相册");
  });

  it("keeps the login CTA on the home page for guests", () => {
    const html = renderToStaticMarkup(createElement(HomeActions, { isAuthenticated: false }));

    expect(html).toContain('href="/login"');
    expect(html).toContain("登录");
    expect(html).toContain('href="/albums"');
    expect(html).toContain("相册");
  });

  it("redirects authenticated users to /albums", () => {
    expect(getAuthenticatedRedirectPath(true)).toBe("/albums");
    expect(getAuthenticatedRedirectPath(false)).toBeNull();
  });
});
