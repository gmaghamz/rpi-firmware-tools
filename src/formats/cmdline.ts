import _ from "lodash";

export interface CmdlineParam {
  name: string;
  value?: string;
}

export function cmdlineParse(text: string): CmdlineParam[] {
  return _.chain(text)
    .split(" ")
    .map((param) => {
      const [name, ...rest] = _.split(param, "=");
      const value = _.join(rest, "=");
      return {
        name,
        value,
      };
    })
    .value();
}

export function cmdlineStringify(cmdlineParams: CmdlineParam[]): string {
  return _.chain(cmdlineParams)
    .map(({ name, value }) => {
      if (!value) {
        return name;
      }

      return `${name}=${value}`;
    })
    .join(" ")
    .value();
}
