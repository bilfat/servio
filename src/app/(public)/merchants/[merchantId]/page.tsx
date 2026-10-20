import { redirect } from "next/navigation";

export default async function MerchantPage({
  params,
}: {
  params: Promise<{ merchantId: string }>;
}) {
  const { merchantId } = await params;
  redirect(`/merchants/${merchantId}/storefront`);
}
