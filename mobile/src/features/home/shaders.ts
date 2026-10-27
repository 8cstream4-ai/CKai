export const ORB_SHADER = `
uniform float2 resolution;
uniform float time;
uniform float energy;
half4 main(float2 xy) {
  float2 p = (xy - resolution * 0.5) / (resolution.x * 0.5);
  float angle = atan(p.y, p.x);
  float radius = length(p);
  float wave = 0.016 * sin(angle * 3.0 + time * 0.7) + 0.009 * sin(angle * 5.0 - time * 0.45);
  float body = 1.0 - smoothstep(0.625 + wave, 0.642 + wave, radius);
  float z = sqrt(max(0.0, 1.0 - radius * radius / 0.42));
  float3 normal = normalize(float3(p * 1.45, z));
  float diffuse = max(0.0, dot(normal, normalize(float3(-0.5, -0.7, 1.1))));
  float bands = sin(angle * 1.4 + radius * 8.0 - time * 0.55 + sin(p.y * 5.0 + time * 0.3) * 0.7);
  float3 violet = float3(0.56, 0.32, 0.94);
  float3 cyan = float3(0.22, 0.85, 0.95);
  float3 pink = float3(0.96, 0.52, 0.76);
  float3 color = mix(violet, cyan, smoothstep(-0.9, 0.6, bands));
  color = mix(color, pink, 0.45 * (0.5 + 0.5 * sin(angle * 2.0 + time * 0.6 + radius * 3.5)));
  color *= 0.46 + 0.55 * diffuse;
  float highlight = exp(-length((p - float2(-0.22, -0.25)) * float2(4.0, 6.5)) * 2.6);
  float rim = pow(clamp(radius / 0.64, 0.0, 1.0), 10.0);
  color += float3(0.9, 0.96, 1.0) * highlight * 0.95;
  color += float3(0.49, 0.65, 1.0) * rim * 0.30;
  float halo = exp(-pow((radius - 0.64) * 9.0, 2.0)) * 0.18 * (1.0 + energy * 0.45);
  float alpha = clamp(body + halo * (1.0 - body), 0.0, 1.0);
  return half4((color * body + float3(0.48, 0.38, 0.85) * halo * (1.0 - body)) * alpha, alpha);
}`;
export const BACKGROUND_SHADER = `
uniform float2 resolution;
uniform float time;
uniform float light;
float hash(float2 p) { return fract(sin(dot(p, float2(127.1,311.7))) * 43758.5453); }
half4 main(float2 xy) {
  float2 uv = xy / resolution;
  float2 a = float2(0.16 + sin(time * 0.11) * 0.08, 0.23 + cos(time * 0.09) * 0.06);
  float2 b = float2(0.84 + cos(time * 0.08) * 0.06, 0.40 + sin(time * 0.1) * 0.08);
  float2 c = float2(0.52 + sin(time * 0.07) * 0.12, 0.85);
  float violet = exp(-dot((uv-a)*float2(2.3,1.6),(uv-a)*float2(2.3,1.6))*4.0);
  float cyan = exp(-dot((uv-b)*float2(2.4,2.1),(uv-b)*float2(2.4,2.1))*4.0);
  float rose = exp(-dot((uv-c)*float2(2.1,2.2),(uv-c)*float2(2.1,2.2))*4.0);
  float3 color = float3(0.36,0.19,0.68)*violet + float3(0.10,0.52,0.62)*cyan + float3(0.55,0.20,0.40)*rose;
  float grain = (hash(xy * 3.0) - 0.5) * 0.035;
  float alpha = light > 0.5 ? 0.10 : 0.19;
  return half4(max(float3(0.0),color + grain) * alpha, alpha);
}`;
