import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { InvitationAcceptance } from "@/components/albums/invitation-acceptance";

export const dynamic = "force-dynamic";

type InvitationPageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params;

  const invite = await prisma.albumInvite.findUnique({
    where: { token },
    include: {
      album: {
        select: { name: true },
      },
      inviter: {
        select: { nickname: true },
      },
    },
  });

  if (!invite) {
    notFound();
  }

  // Mask email for display
  const maskedEmail = invite.email.replace(
    /^(.{1,3}).*(@.*)$/,
    (_: string, start: string, domain: string) =>
      start + "***" + domain
  );

  return (
    <main className="min-h-dvh px-4 py-6 sm:px-10 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md items-center justify-center sm:min-h-[calc(100dvh-5rem)]">
        <InvitationAcceptance
          token={invite.token}
          albumName={invite.album.name}
          inviterName={invite.inviter.nickname}
          maskedEmail={maskedEmail}
          status={invite.status}
          expiredAt={invite.expired_at.toISOString()}
        />
      </div>
    </main>
  );
}
