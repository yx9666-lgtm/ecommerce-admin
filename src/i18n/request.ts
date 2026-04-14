import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  let locale = "zh";
  try {
    const cookieStore = await cookies();
    locale = cookieStore.get("locale")?.value || "zh";
  } catch {
    locale = "zh";
  }

  if (locale !== "zh" && locale !== "en") {
    locale = "zh";
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
