// Tadween sign-in showcase: replaces Postiz's marketing panel on the auth pages.
// Static server component; colours come from the --tdw-* tokens in app/tadween.scss.
const POINTS = [
  { title: 'Built for LinkedIn', body: 'Profiles and company pages, previewed exactly as the feed shows them.' },
  { title: 'Fluent in Arabic', body: 'Right-to-left editor and previews, written for Egyptian and Gulf readers.' },
  { title: 'A quiet smart layer', body: 'Best-time hints and stronger hooks. Nothing changes until you apply it.' },
];

export const AuthShowcase = () => {
  return (
    <div className="hidden lg:flex flex-1 flex-col justify-center gap-[36px] px-[56px] rounded-[20px] bg-[var(--tdw-primary-soft)] text-[var(--tdw-foreground)] overflow-hidden">
      <div className="flex flex-col gap-[12px] max-w-[560px]">
        <div className="text-[44px] leading-[48px] font-[600] tracking-[-0.03em]">
          Your LinkedIn week, written and scheduled.
        </div>
        <div className="text-[17px] leading-[26px] text-[var(--tdw-muted-foreground)]">
          Plan posts for your profile and pages, see them as LinkedIn will, and publish at the hour your audience is reading.
        </div>
      </div>

      <div className="relative max-w-[520px]">
        <div className="rounded-[16px] bg-white text-[rgba(0,0,0,0.9)] shadow-[0_16px_48px_rgba(0,0,0,0.18)] p-[16px] flex flex-col gap-[10px]">
          <div className="flex gap-[10px] items-center">
            <div className="w-[44px] h-[44px] rounded-full bg-[#dce6f1] text-[#0a66c2] font-[600] flex items-center justify-center">MA</div>
            <div className="flex flex-col leading-[16px]">
              <span className="text-[14px] font-[600]">Mona Adel <span className="font-[400] text-[rgba(0,0,0,0.6)]">• You</span></span>
              <span className="text-[12px] text-[rgba(0,0,0,0.6)]">Founder at Studio Nile</span>
              <span className="text-[12px] text-[rgba(0,0,0,0.6)]">Now • Public</span>
            </div>
          </div>
          <div className="text-[14px] leading-[20px] whitespace-pre-line">
            {'We hired our first 10 engineers in Cairo in 90 days.\n\nThree things made it work — '}
            <span className="text-[rgba(0,0,0,0.6)]">…more</span>
          </div>
          <div className="h-[120px] rounded-[8px] bg-[#e2f3ef] flex items-end gap-[10px] p-[14px]">
            <div className="w-[34%] h-[80%] rounded-[10px] bg-[#0b7062]" />
            <div className="w-[44%] h-[55%] rounded-[10px] bg-white" />
            <div className="w-[26px] h-[26px] rounded-full bg-[#f2b54a] self-start" />
          </div>
        </div>
        <div className="absolute -right-[18px] -bottom-[22px] flex items-center gap-[10px] rounded-[14px] bg-[var(--tdw-popover)] text-[var(--tdw-foreground)] px-[14px] py-[10px] shadow-[var(--tdw-shadow-lg)]">
          <span className="w-[10px] h-[10px] rounded-full bg-[var(--tdw-primary)]" />
          <span className="flex flex-col leading-[18px]">
            <span className="text-[13px] font-[600]">Wed 14 Oct · 08:45</span>
            <span className="text-[12px] text-[var(--tdw-muted-foreground)]">Scheduled · best time</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[16px] max-w-[720px] pt-[8px]">
        {POINTS.map((p) => (
          <div key={p.title} className="flex flex-col gap-[4px]">
            <span className="text-[15px] font-[600]">{p.title}</span>
            <span className="text-[13px] leading-[19px] text-[var(--tdw-muted-foreground)]">{p.body}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
