using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BetterSchedule.Server.Extensions.Json.Converters
{
    /// <summary>
    /// JSON converter for <see cref="DateOnly"/> values.
    /// Serializes as <c>"yyyy-MM-dd"</c> and parses the same.
    /// Used for effective date ranges in availability and similar fields.
    /// </summary>
    public sealed class DateOnlyJsonConverter : JsonConverter<DateOnly>
    {
        private const string Format = "yyyy-MM-dd";

        /// <summary>
        /// Reads a <see cref="DateOnly"/> from a JSON string in <c>"yyyy-MM-dd"</c> format.
        /// </summary>
        public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var text = reader.GetString();
            if (string.IsNullOrWhiteSpace(text))
                throw new JsonException("Expected a date string in yyyy-MM-dd.");

            if (DateOnly.TryParseExact(text, Format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var result))
                return result;

            throw new JsonException($"Invalid DateOnly. Expected yyyy-MM-dd but received '{text}'.");
        }

        /// <summary>
        /// Writes a <see cref="DateOnly"/> as a JSON string in <c>"yyyy-MM-dd"</c> format.
        /// </summary>
        public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options)
            => writer.WriteStringValue(value.ToString(Format, CultureInfo.InvariantCulture));
    }
}
