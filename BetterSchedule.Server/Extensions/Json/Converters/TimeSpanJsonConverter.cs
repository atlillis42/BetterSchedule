using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BetterSchedule.Server.Extensions.Json.Converters
{
    /// <summary>
    /// JSON converter for <see cref="TimeSpan"/> values.
    /// Serializes as <c>"HH:mm:ss"</c> and parses the same.
    /// Intended for “time of day” use in organization settings and availability.
    /// </summary>
    public sealed class TimeSpanJsonConverter : JsonConverter<TimeSpan>
    {
        private const string Format = @"hh\:mm\:ss";

        /// <summary>
        /// Reads a <see cref="TimeSpan"/> from a JSON string in <c>"HH:mm:ss"</c> format.
        /// </summary>
        public override TimeSpan Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var text = reader.GetString();
            if (string.IsNullOrWhiteSpace(text))
                throw new JsonException("Expected a time string in HH:mm:ss.");

            if (TimeSpan.TryParseExact(text, Format, CultureInfo.InvariantCulture, out var result))
                return result;

            throw new JsonException($"Invalid TimeSpan. Expected HH:mm:ss but received '{text}'.");
        }

        /// <summary>
        /// Writes a <see cref="TimeSpan"/> as a JSON string in <c>"HH:mm:ss"</c> format.
        /// </summary>
        public override void Write(Utf8JsonWriter writer, TimeSpan value, JsonSerializerOptions options)
            => writer.WriteStringValue(value.ToString(Format, CultureInfo.InvariantCulture));
    }
}
