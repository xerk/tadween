// @ts-ignore
import twitter from 'twitter-text';

export const textSlicer = (
  integrationType: string,
  end: number,
  text: string
): { start: number; end: number } => {
  if (integrationType === 'threads') {
    // the limit counts UTF-8 bytes (countLength), so the crop does too
    const encoder = new TextEncoder();
    let bytes = 0;
    let index = 0;
    for (const char of text) {
      bytes += encoder.encode(char).length;
      if (bytes > end) {
        break;
      }
      index += char.length;
    }
    return {
      start: 0,
      end: index,
    };
  }

  if (integrationType !== 'x') {
    return {
      start: 0,
      end,
    };
  }

  const { validRangeEnd, valid } = twitter.parseTweet(text, {
    version: 3,
    maxWeightedTweetLength: end,
    scale: 100,
    defaultWeight: 200,
    emojiParsingEnabled: true,
    transformedURLLength: 23,
    ranges: [
      { start: 0, end: 4351, weight: 100 },
      { start: 8192, end: 8205, weight: 100 },
      { start: 8208, end: 8223, weight: 100 },
      { start: 8242, end: 8247, weight: 100 },
    ],
  });

  return {
    start: 0,
    end: valid ? end : validRangeEnd,
  };
};

export const weightedLength = (text: string): number => {
  return twitter.parseTweet(text).weightedLength;
};

export const countLength = (integrationType: string, text: string): number => {
  if (integrationType === 'x') {
    return weightedLength(text);
  }

  if (integrationType === 'threads') {
    return new TextEncoder().encode(text).length;
  }

  return text.length;
};
