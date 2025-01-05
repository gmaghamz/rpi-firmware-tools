import _ from "lodash";

const SPECIAL_FILTER_GLOBAL = "__global";
const SPECIAL_FILTER_ALL = "all";

const CONFIG_LINE_KIND_EMPTY = "empty";
const CONFIG_LINE_KIND_COMMENT = "comment";
const CONFIG_LINE_KIND_PROPERTY = "property";
const CONFIG_LINE_KIND_FILTER = "filter";

export interface ConfigLine {
  text: string;
}

export interface EmptyConfigLine extends ConfigLine {
  kind: typeof CONFIG_LINE_KIND_EMPTY;
}

export interface CommentConfigLine extends ConfigLine {
  kind: typeof CONFIG_LINE_KIND_COMMENT;
}

export interface PropertyConfigLine extends ConfigLine {
  kind: typeof CONFIG_LINE_KIND_PROPERTY;
  property: string;
  value: string;
}

interface FilterConfigLine extends ConfigLine {
  kind: typeof CONFIG_LINE_KIND_FILTER;
  filter: string;
}

export function isCommentConfigLine(obj: ConfigLine): obj is CommentConfigLine {
  return (obj as any).kind === CONFIG_LINE_KIND_COMMENT;
}

export function isPropertyConfigLine(obj: ConfigLine): obj is PropertyConfigLine {
  return (obj as any).kind === CONFIG_LINE_KIND_PROPERTY;
}

function isFilterConfigLine(obj: ConfigLine): obj is FilterConfigLine {
  return (obj as any).kind === CONFIG_LINE_KIND_FILTER;
}

export interface FirmwareConfig {
  [x: string]: ConfigLine[];
  [SPECIAL_FILTER_GLOBAL]: ConfigLine[];
  [SPECIAL_FILTER_ALL]: ConfigLine[];
}

const COMMENT_CHAR = "#";
const PROPERTY_REG_EXP = /^(?<property>[^=\s]+)=(?<value>[^\s]+)$/;
const FILTER_REG_EXP = /^\[(?<filter>[^\[\]]+)\]$/;

const parseEmptyConfigLine = (l: string, i: number): EmptyConfigLine | null => {
  if (l.length > 0) {
    return null;
  }

  return {
    kind: "empty",
    text: l,
  };
};

const parseCommentConfigLine = (l: string, i: number): CommentConfigLine | null => {
  if (!l.startsWith(COMMENT_CHAR)) {
    return null;
  }

  return {
    kind: "comment",
    text: l,
  };
};

const parsePropertyConfigLine = (l: string, i: number): PropertyConfigLine | null => {
  const propertyMatchArr = l.match(PROPERTY_REG_EXP);
  if (!propertyMatchArr?.groups) {
    return null;
  }

  const { property, value } = propertyMatchArr.groups;
  if (!property || !value) {
    return null;
  }

  return {
    kind: "property",
    text: l,
    property,
    value,
  };
};

const parseFilterConfigLine = (l: string, i: number): FilterConfigLine | null => {
  const filterMatchArr = l.match(FILTER_REG_EXP);
  if (!filterMatchArr?.groups) {
    return null;
  }

  const { filter } = filterMatchArr.groups;
  if (!filter) {
    return null;
  }

  return {
    kind: "filter",
    text: l,
    filter,
  };
};

const parseConfigLine = (l: string, i: number): ConfigLine | null => {
  const parsers = [parseEmptyConfigLine, parseCommentConfigLine, parsePropertyConfigLine, parseFilterConfigLine];

  for (let i = 0; i < parsers.length; i++) {
    const parser = parsers[i];
    const configLine = parser(l, i);
    if (configLine) {
      return configLine;
    }
  }

  return null;
};

export function configParse(text: string): FirmwareConfig {
  const configLineArr = _.chain(text)
    .trimEnd("\n")
    .split("\n")
    .map((l, i) => {
      const configLine = parseConfigLine(l, i);
      if (!configLine) {
        throw new Error(`Could not parse config line ${l}`);
      }

      return configLine;
    })
    .value();

  let currentFilter: string | undefined;
  const result: FirmwareConfig = {
    [SPECIAL_FILTER_GLOBAL]: [],
    [SPECIAL_FILTER_ALL]: [],
  };

  for (let i = 0; i < configLineArr.length; i++) {
    const configLine = configLineArr[i];
    if (isFilterConfigLine(configLine)) {
      currentFilter = configLine.filter;
      continue;
    }

    if (!currentFilter) {
      result[SPECIAL_FILTER_GLOBAL].push(configLine);
      continue;
    }

    if (currentFilter === SPECIAL_FILTER_ALL) {
      result[SPECIAL_FILTER_ALL].push(configLine);
      continue;
    }

    const filterArr = result[currentFilter] ?? [];
    filterArr.push(configLine);
    result[currentFilter] = filterArr;
  }

  return result;
}

export function configStringify(config: FirmwareConfig): string {
  const { [SPECIAL_FILTER_GLOBAL]: __global, [SPECIAL_FILTER_ALL]: all, ...filters } = config;
  const configLines: ConfigLine[] = [];
  if (__global) {
    configLines.push(...__global);
  }

  _.forEach(filters, (filterLines, filter) => {
    configLines.push({
      kind: CONFIG_LINE_KIND_FILTER,
      filter,
      text: `[${filter}]`,
    } as FilterConfigLine);
    configLines.push(...filterLines);
  });

  if (all) {
    configLines.push({
      kind: CONFIG_LINE_KIND_FILTER,
      filter: SPECIAL_FILTER_ALL,
      text: `[${SPECIAL_FILTER_ALL}]`,
    } as FilterConfigLine);
    configLines.push(...all);
  }

  return _.chain(configLines).map("text").push("").join("\n").value();
}
