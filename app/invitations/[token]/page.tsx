import { notFound } from "next/navigation";
import { cookies } from "next/headers";
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
    <main className="min-h-screen px-5 py-10 sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
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
