import { describe, it, expect } from "vitest";
import { loadClientConfig } from "../src/config/client-loader";
import { ClientConfigSchema } from "../src/schemas/client.schema";

describe("ClientConfigSchema validation", () => {
  it("debe cargar y validar exitosamente el cliente demo-professional", () => {
    const config = loadClientConfig("demo-professional");
    expect(config.id).toBe("demo-professional");
    expect(config.businessName).toBe("Alva & Asociados");
    expect(config.variant).toBe("professional");
    expect(config.services.length).toBeGreaterThan(0);
    expect(config.advantages.length).toBeGreaterThan(0);
  });

  it("debe cargar y validar exitosamente el cliente demo-commerce", () => {
    const config = loadClientConfig("demo-commerce");
    expect(config.id).toBe("demo-commerce");
    expect(config.businessName).toBe("Ferretería El Maestro");
    expect(config.variant).toBe("commerce");
    expect(config.services.length).toBeGreaterThan(0);
  });

  it("debe cargar y validar exitosamente el cliente demo-beauty", () => {
    const config = loadClientConfig("demo-beauty");
    expect(config.id).toBe("demo-beauty");
    expect(config.businessName).toBe("Aura Studio & Spa");
    expect(config.variant).toBe("beauty");
    expect(config.services.length).toBeGreaterThan(0);
  });

  it("debe cargar y validar exitosamente el cliente demo-artist (nueva variante)", () => {
    const config = loadClientConfig("demo-artist");
    expect(config.id).toBe("demo-artist");
    expect(config.businessName).toBe("Tyler Kealey");
    expect(config.variant).toBe("artist");
    expect(config.packages?.length).toBeGreaterThan(0);
    expect(config.videos?.length).toBeGreaterThan(0);
    expect(config.events?.length).toBeGreaterThan(0);
    expect(config.gallery?.length).toBeGreaterThan(0);
  });

  it("debe cargar y validar el cliente consultoria-proyectos", () => {
    const config = loadClientConfig("consultoria-proyectos");
    expect(config.id).toBe("consultoria-proyectos");
    expect(config.businessName).toBe("Desarrolladores & Consultores para Proyectos");
    expect(config.variant).toBe("professional");
  });

  it("debe permitir omitir secciones opcionales (redes, horarios, imágenes)", () => {
    const minimalConfig = {
      id: "cliente-minimo",
      businessName: "Taller Mecánico Hermanos Díaz",
      tagline: "Reparación y mantenimiento automotriz",
      variant: "commerce",
      colors: {
        primary: "#dc2626",
      },
      hero: {
        title: "Taller mecánico de confianza en Los Olivos",
        description: "Mecánica preventiva y correctiva con repuestos de calidad y garantía.",
        ctaPrimary: {
          text: "Contáctanos",
          link: "#contacto",
        },
      },
      about: {
        title: "Sobre nuestro taller",
        description: "Más de 10 años atendiendo vehículos con honestidad y rapidez en Lima Norte.",
      },
      services: [
        {
          id: "afinamiento",
          title: "Afinamiento electrónico",
          description: "Limpieza de inyectores, cambio de bujías y escaneo computarizado.",
        },
      ],
      advantages: [
        {
          title: "Garantía de 6 meses",
          description: "Garantizamos todos nuestros trabajos mecánicos.",
        },
      ],
      contact: {
        phone: "+51 987 111 222",
      },
      seo: {
        title: "Taller Mecánico Hermanos Díaz | Los Olivos",
        description: "Servicio de mecánica automotriz, frenos, suspensión y afinamiento en Los Olivos.",
      },
    };

    const parsed = ClientConfigSchema.safeParse(minimalConfig);
    expect(parsed.success).toBe(true);
  });

  it("debe rechazar IDs con formato inválido (mayúsculas, espacios, caracteres especiales)", () => {
    const invalidIdConfig = {
      id: "Cliente Invalido!",
      businessName: "Negocio Test",
      tagline: "Lema de prueba",
      variant: "professional",
      colors: { primary: "#000000" },
      hero: {
        title: "Título de prueba",
        description: "Descripción de prueba para el hero",
        ctaPrimary: { text: "Ir", link: "#" },
      },
      about: {
        title: "Sobre nosotros",
        description: "Descripción extensa de prueba",
      },
      services: [{ id: "1", title: "Servicio", description: "Desc de servicio" }],
      advantages: [{ title: "Ventaja", description: "Desc de ventaja" }],
      contact: {},
      seo: {
        title: "Título SEO largo",
        description: "Descripción SEO que cumple longitud requerida",
      },
    };

    const parsed = ClientConfigSchema.safeParse(invalidIdConfig);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const idError = parsed.error.issues.find((e) =>
        e.path.map(String).includes("id")
      );
      expect(idError).toBeDefined();
    }
  });

  it("debe rechazar correos con formato inválido", () => {
    const invalidEmailConfig = {
      id: "cliente-email-mal",
      businessName: "Negocio Test",
      tagline: "Lema de prueba",
      variant: "beauty",
      colors: { primary: "#ec4899" },
      hero: {
        title: "Título de prueba",
        description: "Descripción de prueba para el hero",
        ctaPrimary: { text: "Ir", link: "#" },
      },
      about: {
        title: "Sobre nosotros",
        description: "Descripción de prueba para la empresa",
      },
      services: [{ id: "1", title: "Servicio", description: "Desc de servicio" }],
      advantages: [{ title: "Ventaja", description: "Desc de ventaja" }],
      contact: {
        email: "correo-invalido-sin-arroba",
      },
      seo: {
        title: "Título SEO largo",
        description: "Descripción SEO que cumple longitud requerida",
      },
    };

    const parsed = ClientConfigSchema.safeParse(invalidEmailConfig);
    expect(parsed.success).toBe(false);
  });

  it("debe lanzar un error cuando el archivo de cliente no existe", () => {
    expect(() => loadClientConfig("cliente-inexistente-xyz")).toThrowError(
      /No se encontró el archivo de configuración/
    );
  });
});
