<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="modelValue.data.apiUrl"
          :label="$t('APIread.UI.ApiUrl')"
          placeholder="https://api.example.com/endpoint"
          outlined
          class="mx-2"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-select
          v-model="modelValue.data.authType"
          :items="authTypes"
          :item-title="'text'"
          :item-value="'value'"
          :label="$t('APIread.UI.AuthType')"
          outlined
          class="mx-2"
        ></v-select>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="modelValue.data.valuePath"
          :label="$t('APIread.UI.ValuePath')"
          placeholder="$.total"
          outlined
          class="mx-2"
          :hint="$t('APIread.UI.ValuePathHint')"
          persistent-hint
        >
          <template v-slot:append>
            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-icon
                  v-bind="attrs"
                  v-on="on"
                  @click="testValuePath"
                  :disabled="!modelValue.data.apiUrl"
                >
                  mdi-test-tube
                </v-icon>
              </template>
              <span>{{ $t('APIread.UI.TestValuePath') }}</span>
            </v-tooltip>
          </template>
        </v-text-field>
      </v-col>
    </v-row>

    <v-row v-if="testResult !== null">
      <v-col cols="12">
        <v-alert
          :type="testResult.success ? 'success' : 'error'"
          text
        >
          {{ testResult.message }}
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-if="modelValue.data.authType === 'basic'">
      <v-col cols="6">
        <v-text-field
          v-model="modelValue.data.username"
          :label="$t('APIread.UI.Username')"
          outlined
          class="mx-2"
        ></v-text-field>
      </v-col>
      <v-col cols="6">
        <v-text-field
          v-model="modelValue.data.password"
          :label="$t('APIread.UI.Password')"
          type="password"
          outlined
          class="mx-2"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row v-if="modelValue.data.authType === 'bearer'">
      <v-col cols="12">
        <v-text-field
          v-model="modelValue.data.token"
          :label="$t('APIread.UI.Token')"
          type="password"
          outlined
          class="mx-2"
        ></v-text-field>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  props: {
    modelValue: {
      type: Object,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      authTypes: [
        { text: 'None', value: 'none' },
        { text: 'Basic Auth', value: 'basic' },
        { text: 'Bearer Token', value: 'bearer' }
      ],
      testResult: null,
      isLoading: false
    };
  },
  methods: {
    async testValuePath() {
      if (!this.modelValue.data.apiUrl) {
        this.testResult = {
          success: false,
          message: this.$t('APIread.UI.TestErrorNoUrl')
        };
        return;
      }

      this.isLoading = true;
      this.testResult = null;

      try {
        const headers = this.getAuthHeaders();
        const response = await fetch(this.modelValue.data.apiUrl, {
          method: 'GET',
          headers: headers
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const path = this.modelValue.data.valuePath || '$.total';
        const value = this.getJsonValue(data, path);
        
        this.testResult = {
          success: true,
          message: this.$t('APIread.UI.TestSuccess', { value })
        };
      } catch (error) {
        this.testResult = {
          success: false,
          message: this.$t('APIread.UI.TestError', { error: error.message })
        };
      } finally {
        this.isLoading = false;
      }
    },
    getAuthHeaders() {
      const headers = {
        'Content-Type': 'application/json'
      };

      switch (this.modelValue.data.authType) {
        case 'basic':
          if (this.modelValue.data.username && this.modelValue.data.password) {
            const credentials = btoa(`${this.modelValue.data.username}:${this.modelValue.data.password}`);
            headers['Authorization'] = `Basic ${credentials}`;
          }
          break;
        case 'bearer':
          if (this.modelValue.data.token) {
            headers['Authorization'] = `Bearer ${this.modelValue.data.token}`;
          }
          break;
      }

      return headers;
    },
    getJsonValue(obj, path) {
      const parts = path.replace('$.', '').split('.');
      let current = obj;
      
      for (const part of parts) {
        if (current === undefined || current === null) {
          throw new Error(`Path ${path} not found in response`);
        }
        current = current[part];
      }
      
      return current;
    }
  },
  mounted() {
    // Initialize default values if not present
    if (!this.modelValue.data.apiUrl) {
      this.modelValue.data.apiUrl = '';
    }
    if (!this.modelValue.data.authType) {
      this.modelValue.data.authType = 'none';
    }
    if (!this.modelValue.data.username) {
      this.modelValue.data.username = '';
    }
    if (!this.modelValue.data.password) {
      this.modelValue.data.password = '';
    }
    if (!this.modelValue.data.token) {
      this.modelValue.data.token = '';
    }
    if (!this.modelValue.data.valuePath) {
      this.modelValue.data.valuePath = '$.total';
    }
  }
};
</script>

<style scoped></style>
