/** IDE Action types — AI can dispatch these to control the full IDE */

export type IDEAction =
  | { type: "switch-file"; file: string }
  | { type: "create-file"; name: string }
  | { type: "delete-file"; name: string }
  | { type: "set-viewport"; size: "desktop" | "tablet" | "mobile" }
  | { type: "toggle-file-explorer" }
  | { type: "toggle-console" }
  | { type: "refresh-preview" }
  | { type: "deploy" }
  | { type: "set-theme"; theme: "dark" | "light" }
  | { type: "insert-code"; file: string; content: string };

/** Human-readable label for an IDE action */
export function describeAction(action: IDEAction): string {
  switch (action.type) {
    case "switch-file":
      return `${action.file} 파일로 전환`;
    case "create-file":
      return `${action.name} 파일 생성`;
    case "delete-file":
      return `${action.name} 파일 삭제`;
    case "set-viewport":
      return `뷰포트를 ${action.size}로 변경`;
    case "toggle-file-explorer":
      return "파일 탐색기 토글";
    case "toggle-console":
      return "콘솔 토글";
    case "refresh-preview":
      return "미리보기 새로고침";
    case "deploy":
      return "배포 실행";
    case "set-theme":
      return `테마를 ${action.theme}로 변경`;
    case "insert-code":
      return `${action.file}에 코드 삽입`;
  }
}
