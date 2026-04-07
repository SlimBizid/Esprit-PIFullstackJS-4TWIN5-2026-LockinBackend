import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChallengeService } from 'src/challenge/challenge.service';

import { RunCodeDto } from './dto/run-code.dto';

type Judge0Status = {
  id: number;
  description: string;
};

type Judge0SubmissionToken = {
  token: string;
};

type Judge0SubmissionResult = {
  token: string;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
  status: Judge0Status;
};

type RunCodeResult = {
  passed: boolean;
  actual: string;
  expected: string;
  runtime: string;
  memoryKb: number | null;
  status: string;
};

type RunCodeResponse = {
  language: RunCodeDto['language'];
  results: RunCodeResult[];
};

type ExecutionLanguage = RunCodeDto['language'];

const SUPPORTED_LANGUAGE_IDS: Record<ExecutionLanguage, number> = {
  javascript: 102,
  typescript: 101,
  python: 109,
  java: 91,
  cpp: 105,
};

const PROCESSING_STATUS_IDS = new Set([1, 2]);

@Injectable()
export class CodeExecutionService {
  constructor(
    private readonly configService: ConfigService,
    private readonly challengeService: ChallengeService,
  ) {}

  async runCode(dto: RunCodeDto): Promise<RunCodeResponse> {
    const challenge = await this.challengeService.findOne(dto.challengeId);

    if (challenge.cases.length === 0) {
      return {
        language: dto.language,
        results: [],
      };
    }

    const submissions = challenge.cases.map((testCase) => {
      const args = testCase.inputs.map((input) =>
        this.parseStoredValue(input.value),
      );

      return {
        language_id: this.getLanguageId(dto.language),
        source_code: this.buildHarness(dto.language, dto.sourceCode, args),
        cpu_time_limit: 2,
        memory_limit: 128000,
      };
    });

    const createdSubmissions = await this.createBatchSubmissions(submissions);
    const tokens = createdSubmissions.map((submission) => submission.token);
    const submissionResults = await this.pollBatchResults(tokens);

    return {
      language: dto.language,
      results: submissionResults.map((result, index) =>
        this.mapResult(result, challenge.cases[index].expectedOutput),
      ),
    };
  }

  private getJudge0BaseUrl() {
    return (
      this.configService.get<string>('JUDGE0_URL')?.trim().replace(/\/$/, '') ||
      'https://ce.judge0.com'
    );
  }

  private getJudge0Headers() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const authToken = this.configService
      .get<string>('JUDGE0_AUTH_TOKEN')
      ?.trim();
    const authUser = this.configService.get<string>('JUDGE0_AUTH_USER')?.trim();

    if (authToken) {
      headers['X-Auth-Token'] = authToken;
    }

    if (authUser) {
      headers['X-Auth-User'] = authUser;
    }

    return headers;
  }

  private getLanguageId(language: ExecutionLanguage) {
    const envMap: Record<ExecutionLanguage, string> = {
      javascript: 'JUDGE0_LANGUAGE_ID_JAVASCRIPT',
      typescript: 'JUDGE0_LANGUAGE_ID_TYPESCRIPT',
      python: 'JUDGE0_LANGUAGE_ID_PYTHON',
      java: 'JUDGE0_LANGUAGE_ID_JAVA',
      cpp: 'JUDGE0_LANGUAGE_ID_CPP',
    };
    const configured = this.configService.get<string>(envMap[language]);
    const parsed = Number.parseInt(
      configured ?? String(SUPPORTED_LANGUAGE_IDS[language]),
      10,
    );

    if (Number.isNaN(parsed)) {
      throw new BadRequestException(
        `Unsupported execution language: ${language}`,
      );
    }

    return parsed;
  }

  private buildHarness(
    language: ExecutionLanguage,
    sourceCode: string,
    args: unknown[],
  ) {
    switch (language) {
      case 'javascript':
        return this.buildJavascriptHarness(sourceCode, args);
      case 'typescript':
        return this.buildTypescriptHarness(sourceCode, args);
      case 'python':
        return this.buildPythonHarness(sourceCode, args);
      case 'java':
        return this.buildJavaHarness(sourceCode, args);
      case 'cpp':
        return this.buildCppHarness(sourceCode, args);
      default:
        throw new BadRequestException(
          `Unsupported execution language: ${language}`,
        );
    }
  }

  private buildJavascriptHarness(sourceCode: string, args: unknown[]) {
    const argList = args.map((arg) => this.toJavascriptLiteral(arg)).join(', ');

    return `
${sourceCode}

const candidate = typeof solution === 'function' ? solution : null;

if (!candidate) {
  throw new Error("Function 'solution' not found. Please keep the function name as solution.");
}

Promise.resolve(candidate(${argList}))
  .then((result) => {
    if (typeof result === 'string') {
      process.stdout.write(result);
      return;
    }

    process.stdout.write(JSON.stringify(result));
  })
  .catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(message);
    process.exit(1);
  });
`.trim();
  }

  private buildTypescriptHarness(sourceCode: string, args: unknown[]) {
    const argList = args.map((arg) => this.toJavascriptLiteral(arg)).join(', ');

    return `
declare const process: {
  stdout: { write: (value: string) => void };
  stderr: { write: (value: string) => void };
  exit: (code: number) => never;
};
declare const Promise: {
  resolve: (value: unknown) => { then: (onFulfilled: (value: unknown) => void) => { catch: (onRejected: (error: unknown) => void) => void } };
};

${sourceCode}

const candidate = typeof solution === 'function' ? solution : null;

if (!candidate) {
  throw new Error("Function 'solution' not found. Please keep the function name as solution.");
}

Promise.resolve(candidate(${argList}))
  .then((result: unknown) => {
    if (typeof result === 'string') {
      process.stdout.write(result);
      return;
    }

    process.stdout.write(JSON.stringify(result));
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(message);
    process.exit(1);
  });
`.trim();
  }

  private buildPythonHarness(sourceCode: string, args: unknown[]) {
    const argList = args.map((arg) => this.toPythonLiteral(arg)).join(', ');

    return `
import json

def __lockin_to_output(value):
    if isinstance(value, str):
        return value
    return json.dumps(value, separators=(",", ":"))

${sourceCode}

candidate = globals().get("solution")

if not callable(candidate):
    raise Exception("Function 'solution' not found. Please keep the function name as solution.")

result = candidate(${argList})
print(__lockin_to_output(result), end="")
`.trim();
  }

  private buildJavaHarness(sourceCode: string, args: unknown[]) {
    const argList = args.map((arg) => this.toJavaLiteral(arg)).join(', ');

    return `
import java.lang.reflect.Array;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

class Judge0Support {
    static List<Object> list(Object... items) {
        return new ArrayList<>(Arrays.asList(items));
    }

    static Map<String, Object> map(Object... entries) {
        LinkedHashMap<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < entries.length; i += 2) {
            map.put((String) entries[i], entries[i + 1]);
        }
        return map;
    }

    static String serialize(Object value) {
        if (value == null) {
            return "null";
        }

        if (value instanceof String) {
            return (String) value;
        }

        if (value instanceof Character) {
            return String.valueOf(value);
        }

        if (value instanceof Boolean) {
            return ((Boolean) value) ? "true" : "false";
        }

        if (value instanceof Number) {
            return numberToString((Number) value);
        }

        if (value instanceof Map<?, ?> map) {
            StringBuilder builder = new StringBuilder();
            builder.append("{");
            Iterator<? extends Map.Entry<?, ?>> iterator = map.entrySet().iterator();
            while (iterator.hasNext()) {
                Map.Entry<?, ?> entry = iterator.next();
                builder.append(quote(String.valueOf(entry.getKey())));
                builder.append(":");
                builder.append(serialize(entry.getValue()));
                if (iterator.hasNext()) {
                    builder.append(",");
                }
            }
            builder.append("}");
            return builder.toString();
        }

        if (value instanceof Iterable<?> iterable) {
            StringBuilder builder = new StringBuilder();
            builder.append("[");
            Iterator<?> iterator = iterable.iterator();
            while (iterator.hasNext()) {
                builder.append(serialize(iterator.next()));
                if (iterator.hasNext()) {
                    builder.append(",");
                }
            }
            builder.append("]");
            return builder.toString();
        }

        if (value.getClass().isArray()) {
            StringBuilder builder = new StringBuilder();
            builder.append("[");
            int length = Array.getLength(value);
            for (int i = 0; i < length; i++) {
                builder.append(serialize(Array.get(value, i)));
                if (i + 1 < length) {
                    builder.append(",");
                }
            }
            builder.append("]");
            return builder.toString();
        }

        return String.valueOf(value);
    }

    private static String numberToString(Number number) {
        if (number instanceof Float || number instanceof Double || number instanceof BigDecimal) {
            return new BigDecimal(number.toString()).stripTrailingZeros().toPlainString();
        }

        return String.valueOf(number);
    }

    private static String quote(String value) {
        StringBuilder builder = new StringBuilder();
        builder.append('"');
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            switch (character) {
                case '\\\\':
                    builder.append((char) 92);
                    builder.append((char) 92);
                    break;
                case '"':
                    builder.append((char) 92);
                    builder.append((char) 34);
                    break;
                case '\\n':
                    builder.append("\\\\n");
                    break;
                case '\\r':
                    builder.append("\\\\r");
                    break;
                case '\\t':
                    builder.append("\\\\t");
                    break;
                default:
                    builder.append(character);
                    break;
            }
        }
        builder.append('"');
        return builder.toString();
    }
}

${sourceCode}

public class Main {
    public static void main(String[] args) {
        Solution candidate = new Solution();
        Object result = candidate.solution(${argList});
        System.out.print(Judge0Support.serialize(result));
    }
}
`.trim();
  }

  private buildCppHarness(sourceCode: string, args: unknown[]) {
    const argList = args.map((arg) => this.toCppLiteral(arg)).join(', ');

    return `
#include <cmath>
#include <iomanip>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <utility>
#include <variant>
#include <vector>

struct JsonValue {
    using Array = std::vector<JsonValue>;
    using Object = std::map<std::string, JsonValue>;
    using Value = std::variant<std::nullptr_t, bool, long long, double, std::string, Array, Object>;

    Value value;

    JsonValue() : value(nullptr) {}
    JsonValue(std::nullptr_t) : value(nullptr) {}
    JsonValue(bool input) : value(input) {}
    JsonValue(long long input) : value(input) {}
    JsonValue(int input) : value(static_cast<long long>(input)) {}
    JsonValue(double input) : value(input) {}
    JsonValue(const std::string& input) : value(input) {}
    JsonValue(const char* input) : value(std::string(input)) {}
    JsonValue(const Array& input) : value(input) {}
    JsonValue(const Object& input) : value(input) {}

    static JsonValue array(std::initializer_list<JsonValue> items) {
        return JsonValue(Array(items));
    }

    static JsonValue object(std::initializer_list<Object::value_type> items) {
        return JsonValue(Object(items));
    }

    bool isNull() const { return std::holds_alternative<std::nullptr_t>(value); }
    bool asBool() const { return std::get<bool>(value); }
    long long asInt() const { return std::get<long long>(value); }
    double asDouble() const {
        return std::holds_alternative<long long>(value)
            ? static_cast<double>(std::get<long long>(value))
            : std::get<double>(value);
    }
    const std::string& asString() const { return std::get<std::string>(value); }
    const Array& asArray() const { return std::get<Array>(value); }
    const Object& asObject() const { return std::get<Object>(value); }
};

std::string escapeString(const std::string& value) {
    std::string escaped;
    for (char character : value) {
        switch (character) {
            case '\\\\':
                escaped.push_back(static_cast<char>(92));
                escaped.push_back(static_cast<char>(92));
                break;
            case '"':
                escaped.push_back(static_cast<char>(92));
                escaped.push_back(static_cast<char>(34));
                break;
            case '\\n': escaped += "\\\\n"; break;
            case '\\r': escaped += "\\\\r"; break;
            case '\\t': escaped += "\\\\t"; break;
            default: escaped += character; break;
        }
    }
    return escaped;
}

std::string numberToString(double value) {
    std::ostringstream stream;
    stream << std::setprecision(15) << value;
    auto stringValue = stream.str();

    if (stringValue.find('.') != std::string::npos) {
        while (!stringValue.empty() && stringValue.back() == '0') {
            stringValue.pop_back();
        }
        if (!stringValue.empty() && stringValue.back() == '.') {
            stringValue.pop_back();
        }
    }

    return stringValue;
}

std::string toOutput(const JsonValue& value);

std::string toOutput(std::nullptr_t) {
    return "null";
}

std::string toOutput(const std::string& value) {
    return value;
}

std::string toOutput(const char* value) {
    return std::string(value);
}

std::string toOutput(bool value) {
    return value ? "true" : "false";
}

template <typename T>
std::enable_if_t<std::is_integral_v<T> && !std::is_same_v<T, bool>, std::string>
toOutput(const T& value) {
    return std::to_string(value);
}

template <typename T>
std::enable_if_t<std::is_floating_point_v<T>, std::string>
toOutput(const T& value) {
    return numberToString(value);
}

template <typename T>
std::string toOutput(const std::vector<T>& values) {
    std::string output = "[";
    for (std::size_t index = 0; index < values.size(); ++index) {
        output += toOutput(values[index]);
        if (index + 1 < values.size()) {
            output += ",";
        }
    }
    output += "]";
    return output;
}

template <typename T>
std::string toOutput(const std::map<std::string, T>& values) {
    std::string output = "{";
    std::size_t index = 0;
    for (const auto& [key, value] : values) {
        output += "\\"" + escapeString(key) + "\\":" + toOutput(value);
        if (index + 1 < values.size()) {
            output += ",";
        }
        ++index;
    }
    output += "}";
    return output;
}

std::string toOutput(const JsonValue& value) {
    if (std::holds_alternative<std::nullptr_t>(value.value)) {
        return "null";
    }
    if (std::holds_alternative<bool>(value.value)) {
        return toOutput(std::get<bool>(value.value));
    }
    if (std::holds_alternative<long long>(value.value)) {
        return toOutput(std::get<long long>(value.value));
    }
    if (std::holds_alternative<double>(value.value)) {
        return toOutput(std::get<double>(value.value));
    }
    if (std::holds_alternative<std::string>(value.value)) {
        return toOutput(std::get<std::string>(value.value));
    }
    if (std::holds_alternative<JsonValue::Array>(value.value)) {
        return toOutput(std::get<JsonValue::Array>(value.value));
    }
    return toOutput(std::get<JsonValue::Object>(value.value));
}

${sourceCode}

int main() {
    std::vector<JsonValue> args = {${argList}};
    Solution candidate;
    auto result = candidate.solution(args);
    std::cout << toOutput(result);
    return 0;
}
`.trim();
  }

  private parseStoredValue(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private normalizeValue(value: unknown) {
    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value);
  }

  private normalizeStdout(stdout: string | null) {
    return (stdout ?? '').trimEnd();
  }

  private mapResult(
    result: Judge0SubmissionResult,
    expectedOutput: string,
  ): RunCodeResult {
    const normalizedExpected = this.normalizeValue(
      this.parseStoredValue(expectedOutput),
    );
    const normalizedActual = this.normalizeStdout(result.stdout);
    const executionError =
      result.compile_output ?? result.stderr ?? result.message ?? null;
    const passed =
      !executionError &&
      result.status.id === 3 &&
      normalizedActual === normalizedExpected;

    return {
      passed,
      actual: executionError ? executionError.trim() : normalizedActual,
      expected: normalizedExpected,
      runtime: result.time ?? '0',
      memoryKb: result.memory,
      status: result.status.description,
    };
  }

  private toJavascriptLiteral(value: unknown): string {
    return JSON.stringify(value);
  }

  private toPythonLiteral(value: unknown): string {
    if (value === null) {
      return 'None';
    }

    if (typeof value === 'boolean') {
      return value ? 'True' : 'False';
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? String(value) : JSON.stringify(value);
    }

    if (typeof value === 'string') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.toPythonLiteral(item)).join(', ')}]`;
    }

    if (typeof value === 'object') {
      return `{${Object.entries(value)
        .map(
          ([key, item]) =>
            `${JSON.stringify(key)}: ${this.toPythonLiteral(item)}`,
        )
        .join(', ')}}`;
    }

    throw new BadRequestException('Unsupported Python literal value.');
  }

  private toJavaLiteral(value: unknown): string {
    if (value === null) {
      return 'null';
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? String(value) : `${value}d`;
    }

    if (typeof value === 'string') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `Judge0Support.list(${value.map((item) => this.toJavaLiteral(item)).join(', ')})`;
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value).flatMap(([key, item]) => [
        JSON.stringify(key),
        this.toJavaLiteral(item),
      ]);

      return `Judge0Support.map(${entries.join(', ')})`;
    }

    throw new BadRequestException('Unsupported Java literal value.');
  }

  private toCppLiteral(value: unknown): string {
    if (value === null) {
      return 'JsonValue(nullptr)';
    }

    if (typeof value === 'boolean') {
      return `JsonValue(${value ? 'true' : 'false'})`;
    }

    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return `JsonValue(static_cast<long long>(${value}))`;
      }

      return `JsonValue(static_cast<double>(${value}))`;
    }

    if (typeof value === 'string') {
      return `JsonValue(${JSON.stringify(value)})`;
    }

    if (Array.isArray(value)) {
      return `JsonValue::array({${value.map((item) => this.toCppLiteral(item)).join(', ')}})`;
    }

    if (typeof value === 'object') {
      return `JsonValue::object({${Object.entries(value)
        .map(
          ([key, item]) =>
            `{${JSON.stringify(key)}, ${this.toCppLiteral(item)}}`,
        )
        .join(', ')}})`;
    }

    throw new BadRequestException('Unsupported C++ literal value.');
  }

  private async createBatchSubmissions(
    submissions: Array<{
      language_id: number;
      source_code: string;
      cpu_time_limit: number;
      memory_limit: number;
    }>,
  ): Promise<Judge0SubmissionToken[]> {
    const response = await fetch(
      `${this.getJudge0BaseUrl()}/submissions/batch`,
      {
        method: 'POST',
        headers: this.getJudge0Headers(),
        body: JSON.stringify({ submissions }),
      },
    );

    if (!response.ok) {
      throw new BadGatewayException(
        `Judge0 rejected the batch submission request with status ${response.status}.`,
      );
    }

    const data = (await response.json()) as Array<
      Judge0SubmissionToken | Record<string, string[]>
    >;

    if (!Array.isArray(data) || data.some((item) => !('token' in item))) {
      throw new BadGatewayException(
        'Judge0 returned an invalid batch submission response.',
      );
    }

    return data as Judge0SubmissionToken[];
  }

  private async pollBatchResults(tokens: string[]) {
    const fields =
      'token,stdout,stderr,compile_output,message,time,memory,status';

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(
        `${this.getJudge0BaseUrl()}/submissions/batch?tokens=${tokens.join(',')}&base64_encoded=false&fields=${fields}`,
        {
          headers: this.getJudge0Headers(),
        },
      );

      if (!response.ok) {
        throw new BadGatewayException(
          `Judge0 rejected the batch result request with status ${response.status}.`,
        );
      }

      const data = (await response.json()) as {
        submissions?: Judge0SubmissionResult[];
      };
      const submissions = data.submissions ?? [];

      if (
        submissions.length === tokens.length &&
        submissions.every(
          (submission) => !PROCESSING_STATUS_IDS.has(submission.status.id),
        )
      ) {
        return submissions;
      }

      await this.sleep(400);
    }

    throw new ServiceUnavailableException(
      'Code execution timed out while waiting for Judge0 to finish.',
    );
  }

  private sleep(milliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
