const { withGradleProperties } = require('expo/config-plugins');

// El default de Expo (-Xmx2048m -XX:MaxMetaspaceSize=512m) no alcanza para que
// lintVitalAnalyzeRelease analice varios módulos nativos en release build y
// falla con "Metaspace" OOM. Subimos los límites.
const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError';

module.exports = function withGradleJvmArgs(config) {
  return withGradleProperties(config, (config) => {
    const key = 'org.gradle.jvmargs';
    const existing = config.modResults.find(
      (item) => item.type === 'property' && item.key === key
    );

    if (existing) {
      existing.value = JVM_ARGS;
    } else {
      config.modResults.push({ type: 'property', key, value: JVM_ARGS });
    }

    return config;
  });
};
