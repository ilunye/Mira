<template>
  <div class="warning card">
    {{ message }}
  </div>
</template>

<script setup>
defineProps({
  message: String
});
</script>

