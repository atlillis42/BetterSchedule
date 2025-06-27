using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
using BetterSchedule.Server; // Ensure this using directive matches your actual Program namespace

namespace Tests.DevTools
{
    public class AuthenticationTests : IClassFixture<WebApplicationFactory<BetterSchedule.Server.Program>>
    {
        private readonly HttpClient _client;

        public AuthenticationTests(WebApplicationFactory<BetterSchedule.Server.Program> factory)
        {
            _client = factory.CreateClient();
        }

        [Theory]
        [InlineData("/api/dev/login")]
        [InlineData("/api/dev/login/serviceprovider")]
        [InlineData("/api/dev/login/client")]
        [InlineData("/api/dev/login/hybrid")]
        public async Task DevLogin_Endpoints_ShouldReturnSuccess(string endpoint)
        {
            // Act
            var response = await _client.PostAsync(endpoint, null);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var content = await response.Content.ReadAsStringAsync();
            Assert.Contains("Signed in", content);
        }

        [Fact]
        public async Task UniversalDevLogin_ShouldSeedUserCorrectly()
        {
            var response = await _client.PostAsync("/api/dev/login", null);

            var content = await response.Content.ReadAsStringAsync();
            var trimmedContent = content.Trim('"'); // removes leading/trailing quotes

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Signed in as dev user with all roles", trimmedContent);
        }

        // Add further tests here for role validation, sign-in persistence, etc.
    }
}
