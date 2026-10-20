-- Tabla de las tarifas dinámicas (entidad PricingRule). Correr UNA vez contra la
-- base de producción antes de desplegar la versión con tarifas dinámicas.
--
-- Por qué un script y no DB_SYNC=alter: en Vercel el punto de entrada es
-- src/app.ts, así que index.ts (y con él sequelize.sync) nunca corre. Además
-- sync({alter: true}) revisa y modifica todas las tablas; esto sólo agrega una.
--
-- Es exactamente el DDL que genera Sequelize a partir de la entidad. Es aditivo:
-- la versión anterior del backend no usa esta tabla, así que volver atrás no
-- requiere borrarla.
--
-- ON DELETE RESTRICT: una categoría con reglas propias no se puede borrar. Con
-- SET NULL sus reglas pasarían a ser globales (categoriaId NULL = todas las
-- categorías) y cambiarían el precio de las demás.

CREATE TABLE IF NOT EXISTS `ReglasTarifa` (
  `id` INTEGER auto_increment,
  `tipo` ENUM('ocupacion', 'antelacion') NOT NULL,
  `desde` INTEGER NOT NULL,
  `hasta` INTEGER,
  `tipoAjuste` ENUM('porcentaje', 'fijo') NOT NULL,
  `valor` DECIMAL(10,2) NOT NULL,
  `activa` TINYINT(1) NOT NULL DEFAULT true,
  `categoriaId` INTEGER,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`categoriaId`) REFERENCES `CategoriasHabitacion` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
