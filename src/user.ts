declare global {
  interface Window {
    userData?: User | null;
  }
}

type ColorConfig = { id: string; value: string };

/*
This could be improved by also intercepting calls to settings api, and updating colors in the class as the user updates them
This is because the settings object isn't sent again after colors are updated, making class colors slightly outdated
Is resolved on a refresh though
*/
export class User {
  private "bg-color-rating-90plus": string = "#383839";
  private "bg-color-rating-85plus": string = "#383839";
  private "bg-color-rating-80plus": string = "#383839";
  private "bg-color-rating-75plus": string = "#10b981";
  private "bg-color-rating-70plus": string = "#10b981";
  private "bg-color-rating-65plus": string = "#1995AD";
  private "bg-color-rating-60plus": string = "#1995AD";
  private "bg-color-rating-55plus": string = "#1995AD";
  private "bg-color-rating-50plus": string = "#ed8936";
  private "bg-color-rating-45plus": string = "#ed8936";
  private "bg-color-rating-40plus": string = "#ed8936";
  private "bg-color-rating-40less": string = "#f56565";

  private "color-rating-90plus": string = "#f8f8f9";
  private "color-rating-85plus": string = "#f8f8f9";
  private "color-rating-80plus": string = "#f8f8f9";
  private "color-rating-75plus": string = "#f8f8f9";
  private "color-rating-70plus": string = "#f8f8f9";
  private "color-rating-65plus": string = "#f8f8f9";
  private "color-rating-60plus": string = "#f8f8f9";
  private "color-rating-55plus": string = "#f8f8f9";
  private "color-rating-50plus": string = "#f8f8f9";
  private "color-rating-45plus": string = "#f8f8f9";
  private "color-rating-40plus": string = "#f8f8f9";
  private "color-rating-40less": string = "#f8f8f9";

  constructor(data?: any) {
    data && data?.settings && this.loadFromConfig(data.settings);
  }

  private loadFromConfig(config: ColorConfig[]): void {
    for (const { id, value } of config) {
      if (id in this) {
        (this as any)[id] = value;
      }
    }
  }

  public getColorPair(rating: number): [string, string] {
    const thresholds = [90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40];

    const matched = thresholds.find((t) => rating >= t);
    const suffix = matched !== undefined ? `${matched}plus` : "40less";

    const bgKey = `bg-color-rating-${suffix}`;
    const colorKey = `color-rating-${suffix}`;

    return [(this as any)[bgKey], (this as any)[colorKey]];
  }
}

export function handleUserData(data: any) {
  window.userData = new User(data);
}
