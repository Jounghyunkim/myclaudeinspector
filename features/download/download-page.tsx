import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/claude/time";

import { formatSize, RELEASES_URL, type LatestRelease } from "./release";

export function DownloadPage({ release }: { release: LatestRelease | null }) {
  const code = "rounded bg-white/[0.08] px-1.5 text-[0.9em] text-[#bbb]";
  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3.5 p-2 sm:p-4">
          <Badge variant="outline" className="self-start">myclaudeinspector.vercel.app/download</Badge>
          <h1 className="font-heading text-[1.3em] font-semibold">My Claude Inspector 데스크톱 앱</h1>
          <p className="max-w-[62ch] text-[15px] leading-loose">
            내 PC의 Claude 상태를 한눈에 보고, 더 잘 쓰는 방법을 추천받는 앱이에요. 설치하면 시작 메뉴에서 열고, 창을 닫아도 트레이에서 정해 둔 주기로 현황을 새로 읽어요.
          </p>
          {release ? (
            <div className="flex flex-wrap items-center gap-3">
              <a href={release.installer.url} className={buttonVariants({ size: "lg" })}>
                Windows용 다운로드
              </a>
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px]">
                  <b>v{release.version}</b> · {formatDate(release.publishedAt)} · {formatSize(release.installer.size)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Windows 10·11 (64비트) ·{" "}
                  <a href={release.notesUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">릴리스 노트 ↗</a> ·{" "}
                  <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">이전 버전 ↗</a>
                </span>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTitle>아직 배포된 버전이 없어요</AlertTitle>
              <AlertDescription>
                첫 버전이 준비되면 여기에서 내려받을 수 있어요. 그 전에는 저장소에서 <code className={code}>bun run dev</code>로 실행해 쓰세요.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      <div className="grid items-start gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="font-heading text-[1.12em] font-medium">설치 방법</h2>
            <ol className="flex list-decimal flex-col gap-3 pl-5">
              <li className="flex flex-col gap-0.5">
                <b>내려받은 파일을 실행해요.</b>
                <span className="text-[13px] text-muted-foreground">
                  파일 이름은 <code className={code}>{release?.installer.name ?? "MyClaudeInspector-Setup-<버전>.exe"}</code>예요.
                </span>
              </li>
              <li className="flex flex-col gap-0.5">
                <b>&quot;Windows의 PC 보호&quot; 창이 뜨면 &quot;추가 정보 → 실행&quot;을 눌러요.</b>
                <span className="text-[13px] text-muted-foreground">코드 서명을 하지 않은 앱이라 Windows가 처음 보는 게시자라고 알려 주는 거예요.</span>
              </li>
              <li className="flex flex-col gap-0.5">
                <b>설치가 끝나면 시작 메뉴에서 &quot;My Claude Inspector&quot;를 열어요.</b>
                <span className="text-[13px] text-muted-foreground">처음 열면 프로젝트 경로를 넣고 불러오기를 눌러요. Claude 설치 경로는 보통 그대로 두면 돼요.</span>
              </li>
              <li className="flex flex-col gap-0.5">
                <b>지울 때는 Windows 설정 → 앱에서 제거해요.</b>
                <span className="text-[13px] text-muted-foreground">
                  PC에 남긴 스냅샷 폴더(<code className={code}>~/.my-claude-inspector</code>)는 직접 지워야 해요.
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="font-heading text-[1.12em] font-medium">이 앱이 하는 일</h2>
            <ul className="flex flex-col gap-3">
              <li className="flex flex-col gap-0.5">
                <b>읽기만 해요</b>
                <span className="text-[13px] text-muted-foreground">내 PC의 <code className={code}>~/.claude</code>와 고른 프로젝트 폴더를 읽어서 보여 줘요. Claude 설정은 바꾸지 않아요.</span>
              </li>
              <li className="flex flex-col gap-0.5">
                <b>PC 밖으로 보내지 않아요</b>
                <span className="text-[13px] text-muted-foreground">이 버전은 랭킹 서버를 포함해 어디에도 기록을 올리지 않아요. 로그인 정보·API 키 같은 비밀 값은 아예 읽지 않아요.</span>
              </li>
              <li className="flex flex-col gap-0.5">
                <b>창을 닫아도 트레이에서 돌아요</b>
                <span className="text-[13px] text-muted-foreground">정해 둔 주기(기본 1시간)로 현황을 새로 읽어요. 완전히 끄려면 트레이 메뉴에서 &quot;종료&quot;를 골라요.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
